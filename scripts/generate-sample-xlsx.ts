/**
 * Generate a sample test workbook at data/claude-certification.xlsx.
 *
 * Usage:
 *   npm run generate-sample-xlsx
 *
 * The generated file follows the required column format:
 *   Question | Answer 1 | Answer 2 | Answer 3 | Answer 4 |
 *   Correct answer(s) | Explanation
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

interface Row {
  Question: string;
  "Answer 1": string;
  "Answer 2": string;
  "Answer 3": string;
  "Answer 4": string;
  "Correct answer(s)": string;
  Explanation: string;
}

const rows: Row[] = [
  {
    Question:
      "Your extraction schema has a required contract_end_date field. When processing documents that don't contain contract end dates, the model fabricates plausible dates to satisfy the required field. How should you fix this?",
    "Answer 1": "Add a validation step that verifies the extracted date.",
    "Answer 2": "Make the contract_end_date field optional (nullable).",
    "Answer 3": "Add few-shot examples of contracts with end dates.",
    "Answer 4":
      "Add a system instruction telling the model not to fabricate values.",
    "Correct answer(s)": "2",
    Explanation:
      "Making the field nullable lets the model return null when the information does not exist in the source document, instead of inventing a value to satisfy a required field.",
  },
  {
    Question:
      "Which prompting technique provides the model with example input/output pairs before the actual task?",
    "Answer 1": "Zero-shot prompting",
    "Answer 2": "Chain-of-thought prompting",
    "Answer 3": "Few-shot prompting",
    "Answer 4": "Retrieval-augmented generation",
    "Correct answer(s)": "3",
    Explanation:
      "Few-shot prompting includes example input/output pairs in the prompt so the model can infer the desired pattern before performing the task.",
  },
  {
    Question:
      "What is the primary benefit of setting a lower temperature (for example, 0) when calling a language model for data extraction?",
    "Answer 1": "It makes responses more creative and varied.",
    "Answer 2": "It produces more deterministic, consistent output.",
    "Answer 3": "It increases the maximum context window.",
    "Answer 4": "It reduces the cost per token.",
    "Correct answer(s)": "2",
    Explanation:
      "A lower temperature reduces randomness in token selection, making the model's output more deterministic and consistent — desirable for structured extraction tasks.",
  },
  {
    Question:
      "When designing a system prompt for a customer support assistant, which instruction best reduces hallucinated answers?",
    "Answer 1":
      "Tell the model to always provide an answer, even if unsure.",
    "Answer 2": "Ask the model to respond only in a single sentence.",
    "Answer 3":
      "Instruct the model to say it doesn't know when the context lacks the answer.",
    "Answer 4": "Increase the temperature to encourage exploration.",
    "Correct answer(s)": "3",
    Explanation:
      "Explicitly permitting the model to say 'I don't know' when the provided context does not contain the answer is an effective way to reduce hallucinations.",
  },
  {
    Question:
      "Which of the following are valid strategies for reducing token usage in a RAG pipeline? (Select all that apply.)",
    "Answer 1": "Retrieve and include only the most relevant chunks.",
    "Answer 2": "Summarize long documents before adding them to the prompt.",
    "Answer 3": "Send the entire knowledge base with every request.",
    "Answer 4": "Cache and reuse a stable system prompt prefix.",
    "Correct answer(s)": "1,2,4",
    Explanation:
      "Retrieving only relevant chunks, summarizing long sources, and caching a stable prompt prefix all reduce tokens. Sending the entire knowledge base every time does the opposite.",
  },
];

function main() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Question",
      "Answer 1",
      "Answer 2",
      "Answer 3",
      "Answer 4",
      "Correct answer(s)",
      "Explanation",
    ],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

  const outPath = path.join(dataDir, "claude-certification.xlsx");
  XLSX.writeFile(workbook, outPath);
  console.log(`Wrote sample test: ${outPath} (${rows.length} questions)`);
}

main();
