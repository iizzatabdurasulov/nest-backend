import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductDto } from './products.dto.js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import type { Express } from 'express';
import { UpdateProductDto } from './update.product.dto.js';

const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const uploadsDirectory = join(process.cwd(), 'uploads');

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create product

  async uploadImage(file: Express.Multer.File) {
    const filename = `${randomUUID()}${imageExtensions[file.mimetype]}`;
    await mkdir(uploadsDirectory, { recursive: true });
    await writeFile(join(uploadsDirectory, filename), file.buffer, {
      flag: 'wx',
    });

    return { image: `/uploads/${filename}` };
  }

  async create(data: ProductDto, userId: number, file?: Express.Multer.File) {
    const uploaded = file ? await this.uploadImage(file) : undefined;
    try {
      return await this.prisma.product.create({
        data: {
          ...data,
          userId,
          oldPrice:
            data.oldPrice == null ? data.oldPrice : String(data.oldPrice),
          image: uploaded?.image ?? data.image,
        },
      });
    } catch (error) {
      if (uploaded) {
        await unlink(
          join(uploadsDirectory, uploaded.image.slice('/uploads/'.length)),
        ).catch(() => undefined);
      }
      throw error;
    }
  }

  // Get products

  findAll() {
    return this.prisma.product.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }

  // Get product by id

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} topilmadi`);
    }

    return product;
  }

  // Delete  products by users
  async deleteAllByUser(userId: number) {
    return this.prisma.product.deleteMany({
      where: { userId },
    });
  }

  // Delete all products from db

  async deleteAll() {
    return this.prisma.product.deleteMany();
  }

  // Delete product by id
  async delete(productId: number, userId: number, role = 'client') {
    const isAdmin = role === 'admin' || role === 'owner';
    const product = await this.prisma.product.findFirst({
      where: { id: productId, ...(isAdmin ? {} : { userId }) },
    });

    if (!product) {
      throw new NotFoundException(`sizga tegishli product topilmadi`);
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { id: productId },
    });

    return {
      message: 'Product successfully deleted',
      data: deletedProduct,
    };
  }

  // Update product
  async update(
    productId: number,
    userId: number,
    data: UpdateProductDto,
    file?: Express.Multer.File,
    role = 'client',
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const isAdmin = role === 'admin' || role === 'owner';
    if (product.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot update this product');
    }

    const uploaded = file ? await this.uploadImage(file) : undefined;

    try {
      return await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...data,
          oldPrice:
            data.oldPrice == null ? data.oldPrice : String(data.oldPrice),
          ...(uploaded && { image: uploaded.image }),
        },
      });
    } catch (error) {
      if (uploaded) {
        await unlink(
          join(uploadsDirectory, uploaded.image.slice('/uploads/'.length)),
        ).catch(() => undefined);
      }

      throw error;
    }
  }
}
