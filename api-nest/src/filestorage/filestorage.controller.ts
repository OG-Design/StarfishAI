import { Controller, Get, Param, UseGuards, Res, Post, UseInterceptors, UploadedFile, Session, UploadedFiles } from '@nestjs/common';

import type { Response } from 'express';

import { FilestorageService } from './filestorage.service';

import { UserFileGuard } from './filestorage.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { v4 as uuidv4 } from 'uuid';

import path from 'path';

import fs from 'fs';

@Controller('filestorage')
// @UseGuards(UserFileGuard)
export class FilestorageController {
    constructor (private fileStorageService: FilestorageService) {}


    @Get(':user')
    getFileIndex(@Param('user') idUser: number) {
        try {
            const files = this.fileStorageService.getUserFileIndex(idUser);
            return files;
        } catch (err) {
            console.error("Filestorage error while using getFileIndex:", err);
        }
    }

    @Get(':user/:file')
    getFile(@Param('user') idUser: number, @Param('file') fileName: string, @Res() res: Response) {

        console.log('getting file for user:', idUser);

        try {
            const file = this.fileStorageService.getUserFile(idUser, fileName);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.send(file);
        } catch (err) {
            console.error('Filestorage error while using getFile:', err);
            res.status(404).send('File not found');
        }

    }

    @Post('/upload')
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: diskStorage({
            destination: (req: any, file: any, cb: any) => {



                const idUser = req.session.user.idUser;
                if (!idUser || !req.session || !req.session.user) {
                    return cb(new Error('User not authenticated'));
                }
                const uploadPath = path.join(__dirname, '../../', 'static/user-assets', String(idUser));
                if(!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, {recursive: true});
                }
                cb(null, uploadPath);
            },
            filename: (req: any, file: any, cb: any) => {
                const ext = path.extname(file.originalname);
                cb(null, `${uuidv4()}${ext}`);
            }
        })
    }))
    uploadFiles(@Session() session, @UploadedFiles() file: Express.Multer.File[], ) {
        return this.fileStorageService.handleUserUploads(session.user.idUser, file, path.join('static/user-assets', String(session.user.idUser)));
    }
}
