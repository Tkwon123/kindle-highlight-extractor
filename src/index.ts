"use strict";
import { Storage } from "@google-cloud/storage";
import * as readline from "readline";
import csvParse from "csv-parse/lib/sync";
import { booksRef, firestore, quotesRef } from "./util/firebase";
const storage = new Storage();

interface IExtract {
  title: string;
  authors: string[];
  preview: string;
  quotes: string[];
}

const readFile = async (fileName, bucket, user = "tim.won.m3@gmail.com") => {
  console.log(`Reading file ${fileName}`);
  const readStream = storage.bucket(bucket).file(fileName).createReadStream();
  try {
    console.time("Processing time:");
    const result = await readDataFromFile(readStream, user);
    uploadArticles(result, user);
    booksRef.add(result);
    moveFile(fileName, bucket, "processed");
    console.timeEnd("Processing time:");
  } catch (err) {
    moveFile(fileName, bucket, "error");
    console.error(err);
  }
};

const uploadArticles = (extract: IExtract, user: string) => {
  const quotes = extract.quotes.map((quote) => {
    return {
      title: extract.title,
      authors: extract.authors,
      quote: quote,
      uploadedBy: user,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
  });

  quotes.forEach((item) => {
    quotesRef.add(item);
  });
};

/**
 * @summary Formats the CSV file provided by Amazon Kindle
 * @param readable
 * @param user
 */
const readDataFromFile = (readable, user): Promise<IExtract> => {
  return new Promise((resolve, reject) => {
    const output = {
      title: "",
      authors: [],
      preview: "",
      quotes: [],
      uploadedBy: user,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    let lineCount = 1;
    readable.on("error", (error) => reject(error));
    readline
      .createInterface(readable)
      .on("line", (line) => {
        if (lineCount === 2) {
          output.title = cleanLine(line);
        } else if (lineCount === 3) {
          // may be multiple authors
          output.authors = cleanLine(line).split(",");
        } else if (lineCount === 5) {
          // preview
          output.preview = cleanLine(line);
        } else if (lineCount > 8) {
          const parsed = csvParse(line);
          output.quotes.push(parsed[0][3]);
        }
        lineCount++;
      })
      .on("close", () => resolve(output));
  });
};

function cleanLine(line: string) {
  line = line.replace(/"/g, "");
  line = line.replace(/,{2,}/g, "");
  line = line.replace(/^by /g, "");
  line = line.trim();
  return line;
}

const modifyFilePath = (
  fileName: string,
  state: "new" | "processed" | "error" = "new",
  oldState = "new"
): string => {
  return fileName.replace(oldState, state);
};

const moveFile = (file, bucket, state) => {
  storage.bucket(bucket).file(file).move(modifyFilePath(file, state));
};

export const storageTrigger = async (data: any, _context) => {
  const { name, bucket } = data;
  console.log(`New file event received: ${name} ${bucket}`);

  if (name.startsWith("extractor/new")) {
    await readFile(name, bucket);
  }
};
