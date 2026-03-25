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

    // get content of a spesific file
    getUserFile(idUser: number, fileName: string) {
        const fileExists = db.prepare(`SELECT * FROM file WHERE user_idUser = ? AND path = ?`).all(idUser, fileName);

        const filePath = path.join(__dirname, this.pathLevel, 'static/user-assets', `${idUser}/${fileName}`);

        console.log('File requested from:', filePath);

        if (fileExists.length === 0 || !idUser || !fileName) {
            throw new NotFoundException('File not found');
        }

        const file = fs.readFileSync(filePath);

        return file;
    }

    // save a user's file upload
    handleUserUpload(idUser: number, file: Express.Multer.File, partialPath: string) {
        console.log('Saving data from', file.filename, 'to database.');
        const fileName = file.filename;
        // const filePath = file.path;
        const originalName = file.originalname;
        const mimetype = file.mimetype;

        try {

            // add to database
            db.prepare(`
                INSERT INTO file (fileName, path, mimetype, alt, originalName, user_idUser) VALUES (?, ?, ?, ?, ?, ?);
            `).run(fileName, partialPath, mimetype, 'No alt', originalName, idUser);

        } catch (err) {
            console.error('Error while uploading file:', err);
            throw new InternalServerErrorException('Error uploading file');
        }
    }

    handleUserUploads(idUser: number, files: Express.Multer.File[], partialPath: string) {
        files.forEach( file => {
            this.handleUserUpload(idUser, file, partialPath);
        });
        return { message: 'Successfully uploaded and saved files!' };
    }
}
