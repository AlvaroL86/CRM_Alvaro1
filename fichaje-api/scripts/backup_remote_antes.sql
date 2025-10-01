-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: mysql-fidelitysoporte.alwaysdata.net    Database: fidelitysoporte_crm
-- ------------------------------------------------------
-- Server version	5.5.5-10.11.13-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ausencias`
--

DROP TABLE IF EXISTS `ausencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ausencias` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `tipo` varchar(40) NOT NULL,
  `motivo` text DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `estado` enum('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  `nif` char(9) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `fk_ausencias_empresa` (`nif`),
  CONSTRAINT `ausencias_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ausencias_empresa` FOREIGN KEY (`nif`) REFERENCES `empresa` (`nif`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ausencias`
--

LOCK TABLES `ausencias` WRITE;
/*!40000 ALTER TABLE `ausencias` DISABLE KEYS */;
INSERT INTO `ausencias` VALUES ('','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vacaciones','Viaje familiar','2025-07-01 00:00:00','2025-07-10 00:00:00','pendiente','18047463F'),('6c52e0a9-41fc-11f0-a28e-ff948e6a3801',NULL,'vacaciones','Vacaciones de verano','2025-07-01 00:00:00','2025-07-10 00:00:00','aprobada','18047463F'),('6c533d7d-41fc-11f0-a28e-ff948e6a3801',NULL,'baja_medica','Migraña','2025-06-01 00:00:00','2025-06-03 00:00:00','aprobada','18047463F'),('76084c36-89a0-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Baja_medica','Muy jodido','2025-09-11 00:00:00','2025-09-15 00:00:00','pendiente','18047463F');
/*!40000 ALTER TABLE `ausencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_members`
--

DROP TABLE IF EXISTS `chat_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_members` (
  `room_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `role` enum('admin','member') DEFAULT 'member',
  `id` char(36) NOT NULL,
  `joined_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`room_id`,`user_id`),
  KEY `idx_chat_members_room` (`room_id`),
  KEY `idx_chat_members_user` (`user_id`),
  CONSTRAINT `chat_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `chat_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_members`
--

LOCK TABLES `chat_members` WRITE;
/*!40000 ALTER TABLE `chat_members` DISABLE KEYS */;
INSERT INTO `chat_members` VALUES ('21756959-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','member','217644e3-8cd1-11f0-9d03-ff948e6a3801','2025-09-08 18:30:24'),('21756959-8cd1-11f0-9d03-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','member','21768cee-8cd1-11f0-9d03-ff948e6a3801','2025-09-08 18:30:24'),('21756959-8cd1-11f0-9d03-ff948e6a3801','5ecde794-41fc-11f0-a28e-ff948e6a3801','member','2176dc52-8cd1-11f0-9d03-ff948e6a3801','2025-09-08 18:30:24'),('cfa6cf49-8d97-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','member','cfa72bd6-8d97-11f0-9d03-ff948e6a3801','2025-09-09 18:12:33'),('cfa6cf49-8d97-11f0-9d03-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','member','cfa7d260-8d97-11f0-9d03-ff948e6a3801','2025-09-09 18:12:33'),('cfa6cf49-8d97-11f0-9d03-ff948e6a3801','5ecde794-41fc-11f0-a28e-ff948e6a3801','member','cfa7fbd1-8d97-11f0-9d03-ff948e6a3801','2025-09-09 18:12:33');
/*!40000 ALTER TABLE `chat_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` char(36) NOT NULL,
  `room_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `cuerpo` text DEFAULT NULL,
  `tipo` enum('texto','archivo') DEFAULT 'texto',
  `file_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES ('183e0688-8cd1-11f0-9d03-ff948e6a3801','10b92c2c-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Hola','texto',NULL,'2025-09-08 18:30:08'),('3bf9c342-8cd1-11f0-9d03-ff948e6a3801','21756959-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Hola Alvaro','texto',NULL,'2025-09-08 18:31:08'),('40b44058-8cd1-11f0-9d03-ff948e6a3801','3d9f2ddd-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Holaaaa','texto',NULL,'2025-09-08 18:31:16'),('48d2d757-8cd2-11f0-9d03-ff948e6a3801','45099744-8cd2-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Holaaaa alvaro','texto',NULL,'2025-09-08 18:38:39'),('558ac82d-8cd1-11f0-9d03-ff948e6a3801','5412fe93-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Holaaaa','texto',NULL,'2025-09-08 18:31:51'),('58e7f071-8cd1-11f0-9d03-ff948e6a3801','21756959-8cd1-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Hola 2','texto',NULL,'2025-09-08 18:31:57'),('7ee0d27c-96e3-11f0-9d03-ff948e6a3801','7d73a649-96e3-11f0-9d03-ff948e6a3801','aa47f61f-96e2-11f0-9d03-ff948e6a3801','Holaaaa','texto',NULL,'2025-09-21 14:07:02'),('a0709cb0-8ccd-11f0-9d03-ff948e6a3801','9b593be0-8ccd-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','😁😁😁','texto',NULL,'2025-09-08 18:05:19'),('a54cb1c6-8ccd-11f0-9d03-ff948e6a3801','9b593be0-8ccd-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','😍😍','texto',NULL,'2025-09-08 18:05:27'),('bf39188d-8d97-11f0-9d03-ff948e6a3801','b78ad825-8d97-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','😀','texto',NULL,'2025-09-09 18:12:05'),('c1f79b6e-8ccb-11f0-9d03-ff948e6a3801','bf44b94b-8ccb-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Hola','texto',NULL,'2025-09-08 17:51:56'),('d63dc427-8d97-11f0-9d03-ff948e6a3801','cfa6cf49-8d97-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','Holaaa','texto',NULL,'2025-09-09 18:12:44');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_room_members`
--

DROP TABLE IF EXISTS `chat_room_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_room_members` (
  `room_id` varchar(100) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role` enum('owner','admin','member') DEFAULT 'member',
  PRIMARY KEY (`room_id`,`user_id`),
  CONSTRAINT `chat_room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_room_members`
--

LOCK TABLES `chat_room_members` WRITE;
/*!40000 ALTER TABLE `chat_room_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_room_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_rooms`
--

DROP TABLE IF EXISTS `chat_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_rooms` (
  `id` char(36) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `tipo` enum('grupo','privado') NOT NULL,
  `cliente_id` char(36) DEFAULT NULL,
  `nif` varchar(20) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_rooms`
--

LOCK TABLES `chat_rooms` WRITE;
/*!40000 ALTER TABLE `chat_rooms` DISABLE KEYS */;
INSERT INTO `chat_rooms` VALUES ('0221a26d-8cce-11f0-9d03-ff948e6a3801','Soporte','grupo',NULL,'18047463F','2025-09-08 18:08:03'),('07a2ea08-8ccc-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:53:53'),('07a2ecec-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:55:53'),('07a3ecb8-8ccc-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:53:53'),('07a516cd-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:55:53'),('0d2f3a3f-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:50'),('0d31ac62-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:50'),('0d39e307-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:50'),('0d3c3695-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:50'),('0d4951d3-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:36:59'),('0d4bfaf0-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:36:59'),('0d4e3609-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:36:59'),('0d53c6ee-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:37:00'),('0d9627ca-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:56:03'),('0d973bac-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:56:03'),('10b78299-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:56'),('10b92c2c-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:29:56'),('21756959-8cd1-11f0-9d03-ff948e6a3801','Soporte Fidelity','grupo',NULL,'18047463F','2025-09-08 18:30:24'),('23cb2ae6-95ed-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-20 08:43:30'),('23cd6f3f-95ed-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-20 08:43:30'),('2822b16a-95ed-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-20 08:43:38'),('2823fedc-95ed-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-20 08:43:38'),('2e0dd357-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:56:57'),('2e0f437a-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:56:57'),('3d9e1b84-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:11'),('3d9f2ddd-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:11'),('3f97b7d9-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:24'),('3f98f20f-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:24'),('4256ba94-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:19'),('4257ecea-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:19'),('44490bb2-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:01'),('444c0516-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:01'),('450806ec-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:33'),('45099744-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:33'),('4761cfef-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:06'),('47633f2c-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:07'),('4a558fdf-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:42'),('4a56b176-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:42'),('4ad869d1-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:12'),('4ad9c329-9566-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-19 16:38:12'),('5062632f-8cc7-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:20:08'),('50646361-8cc7-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:20:08'),('50c755f9-8d98-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:16:09'),('50c8c1e3-8d98-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:16:09'),('52b85bf7-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:48:49'),('52b98a64-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:48:49'),('52e142c0-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:47'),('52e249cf-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:47'),('53b4f7c6-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:58'),('53b5f4da-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:38:58'),('5411a40c-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:49'),('5412fe93-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:49'),('5889a9d2-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:39:06'),('588ab7ae-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:39:06'),('5a0ce132-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:59'),('5a0e0313-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:31:59'),('5b68ab85-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:39:11'),('5b69e765-8cd2-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:39:11'),('78dcec1d-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:06:52'),('78de771e-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:06:52'),('7c1f3e14-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:59:08'),('7c20a834-9151-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-14 11:59:08'),('7d722e45-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:07:00'),('7d73a649-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:07:00'),('810c0721-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:07:06'),('810d5f1a-96e3-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 14:07:06'),('84a64f45-8cc7-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:21:35'),('84a830a9-8cc7-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:21:35'),('9898ceed-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:05:06'),('989b1bc3-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:05:06'),('9b57b7bf-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:05:10'),('9b593be0-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:05:10'),('acf526c7-9702-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 17:50:15'),('acf75bb8-9702-11f0-9d03-ff948e6a3801','General','',NULL,'F00000000','2025-09-21 17:50:15'),('ae4cb20c-8d99-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:25:56'),('b788e387-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:11:52'),('b78ad825-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:11:52'),('b9b0c81a-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:34:39'),('b9b1d5ff-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:34:39'),('bf42c411-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:51:52'),('bf44b94b-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:51:52'),('c6ac3544-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:52:04'),('c6adbef0-8ccb-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 17:52:04'),('cd738b0b-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:06:34'),('cd74e716-8ccd-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:06:34'),('cfa6cf49-8d97-11f0-9d03-ff948e6a3801','Soporte','grupo',NULL,'18047463F','2025-09-09 18:12:33'),('decbe0e1-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:35:41'),('decdb32d-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:35:41'),('decef3e5-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:35:41'),('ded19e8f-8cd1-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-08 18:35:41'),('e387d123-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:06'),('e38912d3-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:06'),('f4ac52c6-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:35'),('f4adc02a-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:35'),('fd3505cf-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:49'),('fd36c947-8d97-11f0-9d03-ff948e6a3801','General','',NULL,'18047463F','2025-09-09 18:13:49');
/*!40000 ALTER TABLE `chat_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` char(36) NOT NULL,
  `empresa_nombre` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) NOT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  `nif` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_telefono` (`telefono`),
  UNIQUE KEY `uq_clientes_nif_telefono` (`nif`,`telefono`),
  KEY `idx_clientes_nif` (`nif`),
  CONSTRAINT `fk_cli_empresa` FOREIGN KEY (`nif`) REFERENCES `empresa` (`nif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES ('f25b0954-88b3-11f0-a3c7-ff948e6a3801','Fidelity',NULL,'',1,'2025-09-03 12:51:32','18047463F');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes_contactos`
--

DROP TABLE IF EXISTS `clientes_contactos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes_contactos` (
  `id` char(36) NOT NULL,
  `cliente_id` char(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `telefono` varchar(30) NOT NULL,
  `es_principal` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `u_cliente_email` (`cliente_id`,`email`),
  CONSTRAINT `fk_contacto_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes_contactos`
--

LOCK TABLES `clientes_contactos` WRITE;
/*!40000 ALTER TABLE `clientes_contactos` DISABLE KEYS */;
INSERT INTO `clientes_contactos` VALUES ('f25c1760-88b3-11f0-a3c7-ff948e6a3801','f25b0954-88b3-11f0-a3c7-ff948e6a3801','Alvaro Luna','soporte@fidelityfornet.es','662111502',1,'2025-09-03 12:51:32');
/*!40000 ALTER TABLE `clientes_contactos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresa`
--

DROP TABLE IF EXISTS `empresa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresa` (
  `nif` varchar(9) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`nif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa`
--

LOCK TABLES `empresa` WRITE;
/*!40000 ALTER TABLE `empresa` DISABLE KEYS */;
INSERT INTO `empresa` VALUES ('18047463F','Alvaro Luna','alunabzgz@gmai.com','628872392',NULL,1,'2025-06-24 12:25:19'),('F00000000','Empresa Demo',NULL,NULL,NULL,1,'2025-09-16 13:23:13');
/*!40000 ALTER TABLE `empresa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fichajes`
--

DROP TABLE IF EXISTS `fichajes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichajes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(50) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `tipo` enum('entrada','salida','pausa','vuelta','ausencia','vacaciones') NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `fecha_hora` datetime NOT NULL,
  `duracion` int(11) DEFAULT NULL,
  `duracion_prevista_min` int(11) DEFAULT NULL,
  `nif` char(9) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `fk_fichajes_empresa` (`nif`),
  CONSTRAINT `fichajes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fichajes_empresa` FOREIGN KEY (`nif`) REFERENCES `empresa` (`nif`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fichajes`
--

LOCK TABLES `fichajes` WRITE;
/*!40000 ALTER TABLE `fichajes` DISABLE KEYS */;
INSERT INTO `fichajes` VALUES (1,'',NULL,'entrada',NULL,NULL,'2025-06-30 17:24:10',NULL,NULL,'18047463F'),(2,'65bb54b7-41fc-11f0-a28e-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-06-05 13:01:14',NULL,NULL,'18047463F'),(3,'65bb67cf-41fc-11f0-a28e-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','pausa','Descanso para café',NULL,'2025-06-05 15:01:14',15,NULL,'18047463F'),(4,'65bb7c29-41fc-11f0-a28e-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-06-05 15:16:14',NULL,NULL,'18047463F'),(5,'65bb7c8b-41fc-11f0-a28e-ff948e6a3801','5ecde6f5-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-06-05 21:01:14',NULL,NULL,'18047463F'),(6,'',NULL,'entrada',NULL,NULL,'2025-06-30 17:32:41',NULL,NULL,'18047463F'),(7,'',NULL,'entrada',NULL,NULL,'2025-06-30 17:35:31',NULL,NULL,'18047463F'),(8,'',NULL,'entrada',NULL,NULL,'2025-06-30 17:40:57',NULL,NULL,'18047463F'),(9,'b5879c0e-8969-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-04 08:32:41',NULL,NULL,'18047463F'),(10,'bd6fc9da-8969-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-04 08:32:54',NULL,NULL,'18047463F'),(11,'c1d93cca-8969-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-04 08:33:01',NULL,NULL,'18047463F'),(12,'c362e0b6-8969-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-04 08:33:04',NULL,NULL,'18047463F'),(13,'f2d35a7f-8a41-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 12:20:37',NULL,NULL,'18047463F'),(14,'f53d1971-8a41-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 12:20:41',NULL,NULL,'18047463F'),(15,'fb2ff85f-8a41-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 12:20:51',NULL,NULL,'18047463F'),(16,'308f7500-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-05 13:19:37',NULL,NULL,'18047463F'),(17,'334d51f2-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:19:41',NULL,NULL,'18047463F'),(18,'38b99d0f-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-05 13:19:50',NULL,NULL,'18047463F'),(19,'39741622-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:19:52',NULL,NULL,'18047463F'),(20,'3b83ea76-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 13:19:55',NULL,NULL,'18047463F'),(21,'3d65aabc-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:19:58',NULL,NULL,'18047463F'),(22,'3e81dd63-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-05 13:20:00',NULL,NULL,'18047463F'),(23,'6f083137-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:21:21',NULL,NULL,'18047463F'),(24,'713be834-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-05 13:21:25',NULL,NULL,'18047463F'),(25,'74a38324-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:21:31',NULL,NULL,'18047463F'),(26,'85073e14-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-05 13:21:58',NULL,NULL,'18047463F'),(27,'85c53104-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:22:00',NULL,NULL,'18047463F'),(28,'942131b4-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-05 13:22:24',NULL,NULL,'18047463F'),(29,'996c1015-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 13:22:33',NULL,NULL,'18047463F'),(30,'9ad3d910-8a4a-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 13:22:35',NULL,NULL,'18047463F'),(31,'b411b12a-8a50-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 14:06:14',NULL,NULL,'18047463F'),(32,'c1260d5d-8a50-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso',NULL,'2025-09-05 14:06:36',NULL,NULL,'18047463F'),(33,'7f996d58-8a58-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 15:02:02',NULL,NULL,'18047463F'),(34,'848e10d4-8a58-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 15:02:11',NULL,NULL,'18047463F'),(35,'09f57dc4-8a59-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 15:05:54',NULL,NULL,'18047463F'),(36,'10cfe443-8a59-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso',NULL,'2025-09-05 15:06:06',NULL,NULL,'18047463F'),(37,'2b00bf1a-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:25:34',NULL,NULL,'18047463F'),(38,'34ebff6e-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso: Cafe',NULL,'2025-09-05 16:25:51',NULL,NULL,'18047463F'),(39,'37e4f624-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:25:56',NULL,NULL,'18047463F'),(40,'3f5aac39-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso: Cafe!!',NULL,'2025-09-05 16:26:08',NULL,NULL,'18047463F'),(41,'4a6d847a-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:26:27',NULL,NULL,'18047463F'),(42,'4caff9cc-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:26:31',NULL,NULL,'18047463F'),(43,'512865b5-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:26:38',NULL,NULL,'18047463F'),(44,'54446b1d-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-05 16:26:43',NULL,NULL,'18047463F'),(45,'58ce7eb9-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:26:51',NULL,NULL,'18047463F'),(46,'5cabcb8f-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:26:58',NULL,NULL,'18047463F'),(47,'61039a42-8a64-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:27:05',NULL,NULL,'18047463F'),(48,'74f82ae6-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:41:57',NULL,NULL,'18047463F'),(49,'788521ba-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:42:03',NULL,NULL,'18047463F'),(50,'797533d6-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:42:05',NULL,NULL,'18047463F'),(51,'7dff9b45-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso',NULL,'2025-09-05 16:42:12',NULL,NULL,'18047463F'),(52,'e215f618-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:45:00',NULL,NULL,'18047463F'),(53,'e5201f65-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:45:05',NULL,NULL,'18047463F'),(54,'e98dadb0-8a66-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:45:13',NULL,NULL,'18047463F'),(55,'c99ae062-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','comida',NULL,'2025-09-05 16:51:29',NULL,NULL,'18047463F'),(56,'ce75fe36-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:51:37',NULL,NULL,'18047463F'),(57,'d1fbeeac-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:51:43',NULL,NULL,'18047463F'),(58,'d6ab74ac-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:51:51',NULL,NULL,'18047463F'),(59,'da6409b9-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:51:57',NULL,NULL,'18047463F'),(60,'db1578ac-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-05 16:51:58',NULL,NULL,'18047463F'),(61,'db782815-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-05 16:51:59',NULL,NULL,'18047463F'),(62,'df293095-8a67-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','reunión: Comida!!!',NULL,'2025-09-05 16:52:05',NULL,NULL,'18047463F'),(63,'3a7bfc01-8a68-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-05 16:54:38',NULL,NULL,'18047463F'),(64,'8cf0ab5d-8b1b-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-06 14:18:18',NULL,NULL,'18047463F'),(65,'93132fb9-8b1b-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-06 14:18:28',NULL,NULL,'18047463F'),(66,'b18bceaa-8b1b-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso',NULL,'2025-09-06 14:19:19',15,NULL,'18047463F'),(67,'8532827e-8c89-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-08 09:58:05',NULL,NULL,'18047463F'),(68,'86f8557a-8c89-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-08 09:58:08',NULL,NULL,'18047463F'),(69,'93bade79-8c89-11f0-a3c7-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso (15 min)',NULL,'2025-09-08 09:58:29',NULL,NULL,'18047463F'),(70,'e831b343-8c9b-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-08 12:09:29',NULL,NULL,'18047463F'),(71,'ea1fd501-8c9b-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-08 12:09:32',NULL,NULL,'18047463F'),(72,'f6bf4c5a-8c9b-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso · 15 min',NULL,'2025-09-08 12:09:53',NULL,NULL,'18047463F'),(73,'fff965f1-8c9b-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-08 12:10:09',NULL,NULL,'18047463F'),(74,'2c790b21-8c9c-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa','descanso · 15 min',NULL,'2025-09-08 12:11:23',NULL,NULL,'18047463F'),(75,'d598c3cd-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-08 13:49:12',NULL,NULL,'18047463F'),(76,'dedfea0c-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-08 13:49:28',NULL,NULL,'18047463F'),(77,'e221d8ca-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','vuelta',NULL,NULL,'2025-09-08 13:49:33',NULL,NULL,'18047463F'),(78,'e8e42478-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','pausa',NULL,NULL,'2025-09-08 13:49:44',NULL,NULL,'18047463F'),(79,'f7d1222e-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-08 13:50:09',NULL,NULL,'18047463F'),(80,'fa1d01ee-8ca9-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-08 13:50:13',NULL,NULL,'18047463F'),(81,'6db88bd8-8d50-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-09 09:41:40',NULL,NULL,'18047463F'),(82,'754d415c-8e21-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','entrada',NULL,NULL,'2025-09-10 10:37:52',NULL,NULL,'18047463F'),(83,'8f2cfc3d-9612-11f0-9d03-ff948e6a3801','5ecdc144-41fc-11f0-a28e-ff948e6a3801','salida',NULL,NULL,'2025-09-20 13:11:22',NULL,NULL,'F00000000');
/*!40000 ALTER TABLE `fichajes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_key` varchar(60) DEFAULT NULL,
  `label` varchar(60) NOT NULL,
  `parent_key` varchar(60) DEFAULT NULL,
  `path` varchar(120) DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_key` (`menu_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'panel','Panel',NULL,'/dashboard',1),(2,'fichajes','Fichajes',NULL,'/fichajes',2),(3,'ausencias','Ausencias',NULL,'/ausencias',3),(4,'usuarios','Usuarios',NULL,'/admin/users',4),(5,'clientes','Clientes',NULL,'/clientes',5),(6,'tickets','Tickets',NULL,'/tickets',6),(7,'chat','Chat',NULL,'/chat',7);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` char(36) DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `token` char(64) NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `register_requests`
--

DROP TABLE IF EXISTS `register_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `register_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `apellidos` varchar(120) NOT NULL,
  `telefono` varchar(30) NOT NULL,
  `email` varchar(120) NOT NULL,
  `estado` enum('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `register_requests`
--

LOCK TABLES `register_requests` WRITE;
/*!40000 ALTER TABLE `register_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `register_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_slug` varchar(50) NOT NULL,
  `permiso` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_perm` (`role_slug`,`permiso`),
  CONSTRAINT `fk_role_perm_role` FOREIGN KEY (`role_slug`) REFERENCES `roles` (`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `slug` varchar(64) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permisos`)),
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('admin','Admin','Acceso total','{\"modules\":{\"dashboard\":{\"active\":true,\"actions\":{\"view\":true}},\"chat\":{\"active\":true,\"actions\":{\"view\":true,\"send\":true,\"manage\":true}},\"fichajes\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"aprobar\":true}},\"clientes\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}},\"tickets\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"editar\":true,\"cerrar\":true}},\"usuarios\":{\"active\":true,\"actions\":{\"usersview\":true,\"userscreate\":true,\"usersedit\":true,\"usersdelete\":true}}}}'),('empleado','Empleado','Acceso básico','{\"modules\":{\"dashboard\":{\"active\":true,\"actions\":{\"view\":true}},\"chat\":{\"active\":true,\"actions\":{\"manage\":true,\"send\":true,\"view\":true}},\"fichajes\":{\"active\":true,\"actions\":{\"listar\":true}},\"clientes\":{\"active\":true,\"actions\":{\"listar\":true}},\"tickets\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"editar\":true,\"cerrar\":true}},\"usuarios\":{\"active\":false,\"actions\":{}}}}'),('responsable-soporte','Responsable Soporte','','{\"modules\":{\"dashboard\":{\"active\":true,\"actions\":{\"view\":true}},\"chat\":{\"active\":true,\"actions\":{\"view\":true,\"send\":true,\"manage\":true}},\"fichajes\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"aprobar\":true}},\"clientes\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}},\"tickets\":{\"active\":true,\"actions\":{\"listar\":true,\"crear\":true,\"editar\":true,\"cerrar\":true}},\"usuarios\":{\"active\":true,\"actions\":{\"usersview\":true,\"userscreate\":true,\"usersedit\":true,\"usersdelete\":true}}}}'),('supervisor','Supervisor','Permisos medios','[\"users:view\", \"users:edit\"]'),('tecnico-soporte','Tecnico Soporte','Tecnico','[]');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings_categories`
--

DROP TABLE IF EXISTS `settings_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings_categories` (
  `key_name` varchar(50) NOT NULL,
  `label` varchar(120) NOT NULL,
  `scope` enum('global','empresa') NOT NULL DEFAULT 'empresa',
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings_categories`
--

LOCK TABLES `settings_categories` WRITE;
/*!40000 ALTER TABLE `settings_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `settings_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings_items`
--

DROP TABLE IF EXISTS `settings_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings_items` (
  `id` char(36) NOT NULL,
  `category_key` varchar(50) NOT NULL,
  `label` varchar(120) NOT NULL,
  `value` varchar(120) NOT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  `nif` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_key` (`category_key`),
  CONSTRAINT `settings_items_ibfk_1` FOREIGN KEY (`category_key`) REFERENCES `settings_categories` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings_items`
--

LOCK TABLES `settings_items` WRITE;
/*!40000 ALTER TABLE `settings_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `settings_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_mensajes`
--

DROP TABLE IF EXISTS `ticket_mensajes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_mensajes` (
  `id` char(36) NOT NULL,
  `ticket_id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `cuerpo` text NOT NULL,
  `via` enum('web','email') DEFAULT 'web',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_msg_ticket` (`ticket_id`),
  CONSTRAINT `fk_msg_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_mensajes`
--

LOCK TABLES `ticket_mensajes` WRITE;
/*!40000 ALTER TABLE `ticket_mensajes` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_mensajes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` char(36) NOT NULL,
  `cliente_id` char(36) NOT NULL,
  `contacto_id` char(36) DEFAULT NULL,
  `asunto` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('abierto','en_progreso','resuelto','cerrado') DEFAULT 'abierto',
  `prioridad` enum('baja','media','alta','critica') DEFAULT 'baja',
  `user_id` char(36) DEFAULT NULL,
  `via` enum('web','email') DEFAULT 'web',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nif` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ticket_empresa` (`nif`),
  KEY `fk_ticket_contacto` (`contacto_id`),
  KEY `idx_tickets_estado` (`estado`),
  KEY `idx_tickets_prioridad` (`prioridad`),
  KEY `idx_tickets_cliente` (`cliente_id`),
  CONSTRAINT `fk_ticket_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_ticket_contacto` FOREIGN KEY (`contacto_id`) REFERENCES `clientes_contactos` (`id`),
  CONSTRAINT `fk_ticket_empresa` FOREIGN KEY (`nif`) REFERENCES `empresa` (`nif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_menu_permissions`
--

DROP TABLE IF EXISTS `user_menu_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_menu_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` char(36) NOT NULL,
  `menu_key` varchar(60) NOT NULL,
  `can_view` tinyint(1) DEFAULT 1,
  `can_edit` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_menu` (`user_id`,`menu_key`),
  CONSTRAINT `fk_perm_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_menu_permissions`
--

LOCK TABLES `user_menu_permissions` WRITE;
/*!40000 ALTER TABLE `user_menu_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_menu_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` char(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `last_seen` datetime DEFAULT NULL,
  `nif` varchar(9) NOT NULL,
  `telefono` varchar(30) NOT NULL,
  `rol` enum('admin','empleado','supervisor') DEFAULT 'empleado',
  `estado` tinyint(1) DEFAULT 1,
  `avatar_url` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_usuarios_email` (`email`),
  UNIQUE KEY `uq_usuarios_telefono` (`telefono`),
  KEY `fk_usuarios_empresa` (`nif`),
  CONSTRAINT `fk_usuarios_empresa` FOREIGN KEY (`nif`) REFERENCES `empresa` (`nif`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES ('5ecdc144-41fc-11f0-a28e-ff948e6a3801','admin01','Laura Martínez','laura.admin@empresa.com','2025-09-21 14:00:23','F00000000','600123456','admin',1,NULL,'2025-06-05 13:01:02',NULL,'$2b$10$JB5gQ6uk990AB2Js7h3w7uMvqZBzdHQ3j5DA3dtO7xaCXBHZz6mwq'),('5ecde6f5-41fc-11f0-a28e-ff948e6a3801','empleado01','Carlos Pérez','carlos@empresa.com','2025-09-21 19:13:34','F00000000','600654321','empleado',1,NULL,'2025-06-05 13:01:02',NULL,'$2b$10$yVc1K3NySaAEBCvzijFWHOr/2dyVQwyxSyKiAj1kzuG132D27/raO'),('5ecde794-41fc-11f0-a28e-ff948e6a3801','supervisor01','Marta López','marta@empresa.com',NULL,'F00000000','611223344','supervisor',1,NULL,'2025-06-05 13:01:02',NULL,'<HASH_QUE_COPIASTE>'),('aa47f61f-96e2-11f0-9d03-ff948e6a3801','superadmin','Alvaro','soporte@fidelityfornet.es','2025-09-21 19:07:37','F00000000','628872392','admin',1,NULL,'2025-09-21 14:01:06',NULL,'$2b$10$b/kcCos9ATGvFPEX7goOyOElAqRWvWY58T2gKto3TPUDJ9NJzFzBi');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'fidelitysoporte_crm'
--

--
-- Dumping routines for database 'fidelitysoporte_crm'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-30 12:16:53
