-- AlterTable
ALTER TABLE `Pesanan` MODIFY `status` ENUM('MENUNGGAK', 'MENUNGGU_PELUNASAN', 'LUNAS', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENUNGGAK';

-- CreateTable
CREATE TABLE `TransaksiPembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `tokenMidtrans` VARCHAR(191) NOT NULL,
    `tipe` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `pesananId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TransaksiPembayaran_tokenMidtrans_key`(`tokenMidtrans`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
