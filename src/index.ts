"use strict";
import { Storage } from "@google-cloud/storage";
import * as readline from "readline";
import csvParse from "csv-parse/lib/sync";
import { booksRef, quotesRef } from "./util/firebase";
const storage = new Storage();

interface IExtract {
  title: string;
  author: string;
  preview: string;
  quotes: string[];
}

const readFile = async (fileName, bucket) => {
  console.log(`Reading file ${fileName}`);
  const readStream = storage.bucket(bucket).file(fileName).createReadStream();
  try {
    console.time("Processing time:");
    const result = await readDataFromFile(readStream);
    uploadArticles(result);
    booksRef.add(result);
    moveFile(fileName, bucket, "processed");
    console.timeEnd("Processing time:");
  } catch (err) {
    moveFile(fileName, bucket, "error");
    console.error(err);
  }
};

const uploadArticles = (extract: IExtract) => {
  const quotes = extract.quotes.map((quote) => {
    return {
      title: extract.title,
      author: extract.author,
      quote: quote,
    };
  });

  quotes.forEach((item) => {
    quotesRef.add(item);
  });
};

const readDataFromFile = (readable): Promise<IExtract> => {
  return new Promise((resolve, reject) => {
    const output = {
      title: "",
      author: "",
      preview: "",
      quotes: [],
    };
    let lineCount = 1;
    readable.on("error", (error) => reject(error));
    readline
      .createInterface(readable)
      .on("line", (line) => {
        if (lineCount === 2) {
          output.title = cleanLine(line);
        } else if (lineCount === 3) {
          //author
          output.author = cleanLine(line);
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
  line = line.replace('"', "");
  line = line.replace(/,{2,}/g, "");
  line = line.replace(/^by /g, "");
  line = line.trim();
  return line;
}

const modifyFilePath = (
  fileName: string,
  state: "new" | "processed" | "error" = "new"
): string => {
  return fileName.replace("new", state);
};

const moveFile = (file, bucket, state) => {
  storage
    .bucket(bucket)
    .file(modifyFilePath(file))
    .move(modifyFilePath(file, state));
};

export const storageTrigger = async (data: any, _context) => {
  const { name, bucket } = data;
  console.log(`New file event received: ${name} ${bucket}`);

  if (name.startsWith("extractor/new")) {
    await readFile(name, bucket);
  }
};
