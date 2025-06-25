-- CreateTable
CREATE TABLE `Produk` (
    `id` VARCHAR(191) NOT NULL,
    `namaProduk` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `harga` INTEGER NOT NULL,
    `isPO` BOOLEAN NOT NULL DEFAULT false,
    `hargaPO` INTEGER NULL,
    `stok` INTEGER NOT NULL DEFAULT 0,
    `terjual` INTEGER NOT NULL DEFAULT 0,
    `gambarUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Aktif',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
