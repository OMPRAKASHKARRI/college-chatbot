import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { ChatGroq } from "@langchain/groq";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoClient: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
  }

  return mongoClient;
};

const getGroqKey = (): string => {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY missing");
  return key;
};

// ---- Embeddings ----
const getEmbeddings = () =>
  new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  });

// ---- Vector Store ----
const getVectorStore = async () => {
  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  return new MongoDBAtlasVectorSearch(getEmbeddings(), {
    collection: collection as any,
    indexName: "vector_index",
    textKey: "pageContent",
    embeddingKey: "embedding",
  });
};

// ---- Initialize KB ----
export const initializeKnowledgeBase = async (): Promise<void> => {
  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  console.log("🚀 Re-indexing forced...");

  await collection.deleteMany({});

  const loader = new TextLoader(
    path.join(__dirname, "../../knowledge-base/edureach-knowledge.txt")
  );

  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 150,
  });

  const splits = await splitter.splitDocuments(docs);

  const vectorStore = await getVectorStore();

  for (let i = 0; i < splits.length; i++) {
    await vectorStore.addDocuments([splits[i]]);

    if (i % 5 === 0) {
      console.log(`Processed ${i}/${splits.length}`);
    }
  }

  console.log("✅ Indexed successfully");
};

// ---- RAG ----
export const getRAGResponse = async (question: string): Promise<string> => {
  try {
    const vectorStore = await getVectorStore();

    // 🔍 Step 1: Vector search
    const docs = await vectorStore.similaritySearch(question, 5);
    console.log("Docs found:", docs.length);

    let contextDocs = docs;

    // 🔥 Step 2: Smart fallback using keywords
    if (!docs || docs.length === 0) {
      const allDocs = await vectorStore.similaritySearch("", 10);

      const keywords = question.toLowerCase().split(" ");

      contextDocs = allDocs.filter((doc) => {
        const text = doc.pageContent.toLowerCase();
        return keywords.some((word) => text.includes(word));
      });

      console.log("Fallback docs:", contextDocs.length);
    }

    // 🧠 Step 3: Build context
    const context = contextDocs.map((d) => d.pageContent).join("\n\n");

    if (!context || context.trim().length === 0) {
      return "Information not available in EduReach database.";
    }

    console.log("Context length:", context.length);

    // 🧠 Step 4: Prompt
    const prompt = `
You are EduReach Bot.

RULES:
- Answer ONLY using the provided context.
- Keep answers clear and structured.
- Use bullet points where possible.
- If answer is not in context, reply exactly:
"Information not available in EduReach database."

Context:
${context}

Question:
${question}

Answer:
`;

    // 🤖 Step 5: Model
    const model = new ChatGroq({
      apiKey: getGroqKey(),
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
    });

    const response = await model.invoke(prompt);

    if (!response || typeof response.content !== "string") {
      return "No response generated.";
    }

    return response.content.trim();
  } catch (error) {
    console.error("RAG Error:", error);
    return "Something went wrong. Please try again.";
  }
};