import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../users/user.decorator.js';
import { ProductDto } from './products.dto.js';
import { UpdateProductDto } from './update.product.dto.js';
import { ProductsService } from './products.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Create product
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  create(
    @CurrentUser() user: { userId: number },
    @Body() data: ProductDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          overrideMimeType: true,
        })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.productsService.create(data, user.userId, file);
  }

  // Get all product
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // Get product by id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // Delete  products by users
  @UseGuards(AuthGuard('jwt'))
  @Delete()
  deleteByUser(@CurrentUser() user: { userId: number }) {
    return this.productsService.deleteAllByUser(user.userId);
  }

  // Delete all products from db
  @UseGuards(AuthGuard('jwt'))
  @Delete('all')
  deleteAll(@CurrentUser() user: { userId: number; role: string }) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('You are not admin');
    }
    return this.productsService.deleteAll();
  }

  // Delete product by id
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(
    @CurrentUser() user: { userId: number; role: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.delete(id, user.userId, user.role);
  }

  //  Update product
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  update(
    @CurrentUser() user: { userId: number; role: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          overrideMimeType: true,
        })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, user.userId, body, file, user.role);
  }
  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          overrideMimeType: true,
        })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(file);
  }
}
