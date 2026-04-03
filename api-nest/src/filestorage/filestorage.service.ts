import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import db from 'src/db';

import fs from 'fs';
import path from 'path';

import { v4 as uuidv4 } from 'uuid';



@Injectable()
export class FilestorageService {

    private readonly pathLevel = '../../';

    // get all file paths and names + mimetypes
    getUserFileIndex(idUser: number) {
        const files = db.prepare(`SELECT * FROM file WHERE user_idUser = ?`).all(idUser);
        if (files.length === 0) {
            throw new NotFoundException('Files not found');
        }
        return files;
    }

    // get a single file's buffer and mimetype by fileName
    getUserFile(idUser: number, fileName: string): { buffer: Buffer; mimetype: string } {
        const fileRecord: any = db.prepare(`SELECT * FROM file WHERE user_idUser = ? AND fileName = ?`).get(idUser, fileName);
        if (!fileRecord) {
            throw new NotFoundException('File not found');
        }

        const fullFilePath = path.join(__dirname, this.pathLevel, fileRecord.path);
        if (!fs.existsSync(fullFilePath)) {
            throw new NotFoundException('File not found on disk');
        }

        const buffer = fs.readFileSync(fullFilePath);
        return { buffer, mimetype: fileRecord.mimetype };
    }

    // get content of a spesific file
    getUserRequestedFiles(idUser: number, filePaths: string[]) {
        let files: any[] = [];
        filePaths.forEach(filePath => {
            const fileExists = db.prepare(`SELECT * FROM file WHERE user_idUser = ? AND path = ?`).all(idUser, filePath);

            const fullFilePath = path.join(__dirname, this.pathLevel, filePath);

            console.log('File requested from:', fullFilePath);

            if (fileExists.length === 0 || !idUser || !filePath) {
                
                // throw new NotFoundException('File not found');
            }

            const file = fs.readFileSync(fullFilePath);

            files.push(file || 'Not Found');
            
        })
        return files
    }

    // save a user's file upload
    handleUserUpload(idUser: number, file: Express.Multer.File, savePath: string) {
        console.log('Saving data from', file.filename, 'to database.');
        const fileName = file.filename;
        const originalName = file.originalname;
        const mimetype = file.mimetype;

        try {

            // add to database
            const result = db.prepare(`
                INSERT INTO file (fileName, path, mimetype, alt, originalName, user_idUser) VALUES (?, ?, ?, ?, ?, ?);
            `).run(fileName, savePath, mimetype, 'No alt', originalName, idUser);

            return { idFile: Number(result.lastInsertRowid), fileName, originalName, mimetype, path: path.join(savePath, fileName) }

        } catch (err) {
            console.error('Error while uploading file:', err);
            throw new InternalServerErrorException('Error uploading file');
        }
    }

    handleUserUploads(idUser: number, files: Express.Multer.File[], partialPath: string) {
        let filesIndex: any[] = [];
        files.forEach( file => {
            const savePath = path.join(partialPath, file.filename)
            const fileRecord = this.handleUserUpload(idUser, file, savePath);
            filesIndex.push(fileRecord);
        });
        return { message: 'Successfully uploaded and saved files!', filesIndex };
    }
}
