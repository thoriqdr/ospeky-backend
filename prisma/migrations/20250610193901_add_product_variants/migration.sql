/*
  Warnings:

  - You are about to drop the column `harga` on the `Produk` table. All the data in the column will be lost.
  - You are about to drop the column `stok` on the `Produk` table. All the data in the column will be lost.
  - You are about to drop the column `terjual` on the `Produk` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Produk` DROP COLUMN `harga`,
    DROP COLUMN `stok`,
    DROP COLUMN `terjual`,
    MODIFY `gambarUrl` TEXT NULL;

-- CreateTable
CREATE TABLE `Varian` (
    `id` VARCHAR(191) NOT NULL,
    `namaVarian` VARCHAR(191) NOT NULL,
    `harga` INTEGER NOT NULL,
    `stok` INTEGER NOT NULL DEFAULT 0,
    `gambarUrl` VARCHAR(191) NULL,
    `produkId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
