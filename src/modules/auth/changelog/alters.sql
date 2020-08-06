
-- Alters for auth module
-- For security!!

--stop -- > secret table of passwords
DROP TABLE `passwords`;

CREATE TABLE `stop` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `password` varchar(255) DEFAULT NULL,
  `owner` int(11) unsigned NOT NULL,
  `created` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8

CREATE TABLE `access_logger` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(512) NOT NULL,
  `success` tinyint(1) DEFAULT '0',
  `created` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8

ALTER TABLE `CustomUser` add column `loginAccess` tinyint(1) DEFAULT '0';