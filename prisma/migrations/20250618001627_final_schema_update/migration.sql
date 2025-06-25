-- CreateTable
CREATE TABLE `Alamat` (
    `id` VARCHAR(191) NOT NULL,
    `namaPenerima` VARCHAR(191) NOT NULL,
    `nomorTelepon` VARCHAR(191) NOT NULL,
    `kota` VARCHAR(191) NOT NULL,
    `kecamatan` VARCHAR(191) NOT NULL,
    `detailAlamat` TEXT NOT NULL,
    `isAlamatUtama` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
