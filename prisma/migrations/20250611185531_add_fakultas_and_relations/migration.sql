-- AlterTable
ALTER TABLE `Produk` ADD COLUMN `fakultasId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Fakultas` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `universitasId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Fakultas_nama_universitasId_key`(`nama`, `universitasId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
