ALTER TABLE Images MODIFY COLUMN `format` enum('png','jpg','jpeg','gif', 'svg') CHARACTER SET utf8 DEFAULT NULL;
ALTER TABLE Files MODIFY COLUMN `format` enum('pdf','doc','docx') CHARACTER SET utf8 DEFAULT NULL;

CREATE TABLE `games_images` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `gameId` int(11)  unsigned NOT NULL,
    `imageId` int(11)  unsigned NOT NULL,
    `created` DATETIME DEFAULT NULL,
    `modified` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE Images ADD width int;
ALTER TABLE Images DROP COLUMN width;
ALTER TABLE Images ADD isMultiSizes BOOLEAN DEFAULT 0;

-- Below changes from 6.4.2020
ALTER TABLE Audio MODIFY COLUMN `format` enum('mp3', 'm4a', 'wav', 'webm') CHARACTER SET utf8 DEFAULT NULL;
ALTER TABLE Video MODIFY COLUMN `format` enum('mp4', 'ogg', 'avi', 'webm', 'mov') CHARACTER SET utf8 DEFAULT NULL;

-- Below changes from 21.4.2020
ALTER TABLE Audio MODIFY COLUMN `format` enum('mp3', 'm4a', 'wav', 'mpeg', 'webm') CHARACTER SET utf8 DEFAULT NULL;

-- Below is ***optional***

-- CREATE TABLE `Audio` (
--   `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
--   `title` varchar(200) DEFAULT NULL,
--   `description` text,
--   `created` datetime DEFAULT NULL,
--   `format` enum('mp3','wav','webm') CHARACTER SET utf8 DEFAULT NULL,
--   `category` varchar(100) DEFAULT NULL,
--   `modified` datetime DEFAULT NULL,
--   `owner` int(11) DEFAULT NULL,
--   PRIMARY KEY (`id`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8

-- CREATE TABLE `Video` (
--   `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
--   `title` varchar(200) DEFAULT NULL,
--   `description` text,
--   `created` datetime DEFAULT NULL,
--   `format` enum('mp4','ogg','avi','webm') CHARACTER SET utf8 DEFAULT NULL,
--   `category` varchar(100) DEFAULT NULL,
--   `modified` datetime DEFAULT NULL,
--   `owner` int(11) DEFAULT NULL,
--   PRIMARY KEY (`id`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8