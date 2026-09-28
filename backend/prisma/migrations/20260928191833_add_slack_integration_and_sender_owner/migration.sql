/*
  Warnings:

  - Added the required column `ownerId` to the `Sender` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Sender` ADD COLUMN `ownerId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `SlackIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `incomingWebhookUrl` TEXT NOT NULL,
    `incomingWebhookChannel` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `teamName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SlackIntegration_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Sender_ownerId_idx` ON `Sender`(`ownerId`);

-- AddForeignKey
ALTER TABLE `SlackIntegration` ADD CONSTRAINT `SlackIntegration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sender` ADD CONSTRAINT `Sender_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
