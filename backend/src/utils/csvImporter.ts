// FILE: backend/src/utils/csvImporter.ts
import fs from "fs";
import csv from "csv-parser";

/**
 * Parses a CSV file and returns an array of student objects.
 * Expects headers: firstName, lastName, email, phone, course, batch, gender, dob, parentName, parentPhone, parentEmail, relation
 */
export const parseStudentCSV = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        // Clean up file after parsing
        fs.unlinkSync(filePath);
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};
