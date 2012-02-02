<?php
/**
 * Схема таблиц данного модуля.
 * 
 * @version $Id$
 * @package Abricos
 * @subpackage Bopros
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author 
 */

$charset = "CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'";
$updateManager = Ab_UpdateManager::$current; 
$db = Abricos::$db;
$pfx = $db->prefix;

$uprofileManager = Abricos::GetModule('uprofile')->GetManager(); 

if ($updateManager->isInstall()){

	$uprofileManager->FieldAppend('lastname', 'Фамилия', UserFieldType::STRING, 100);
	$uprofileManager->FieldAppend('firstname', 'Имя', UserFieldType::STRING, 100);
	$uprofileManager->FieldCacheClear();
	
	Abricos::GetModule('bopros')->permission->Install();
	
	// проекты
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."bps_project (
		  `projectid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор проекта',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Название',
		  `contentid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор контента',
		  `dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
		  `publish` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата публикации',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
		  `pubkey` varchar(32) NOT NULL DEFAULT '' COMMENT 'Уникальный ключ проекта',
		  PRIMARY KEY  (`projectid`)
		)".$charset
	);

	// права пользователей на каждый проект
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."bps_userrole (
		  `userroleid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  `projectid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор проекта',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `isread` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Доступ на чтение проекта и комментариев',
		  `iswrite` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Доступ на запись комментария',
		  PRIMARY KEY  (`userroleid`)
		)".$charset
	);

	// добавить поле - флаг доступных групп для писателей проектов
	$db->query_write("
		ALTER TABLE `".$db->prefix."group` ADD `isviewbopros` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Доступен в списке групп настройки проекта'"
	);
	
	$db->query_read("
		UPDATE `".$db->prefix."group`
		SET isviewbopros=1
		WHERE groupid=1 OR groupid=2 OR groupid=3 
	");
	
	// права групп на каждый проект
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."bps_grouprole (
		  `grouproleid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  `projectid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор проекта',
		  `groupid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор группы',
		  `isread` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Доступ на чтение проекта и комментариев',
		  `iswrite` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Доступ на запись комментария',
		  PRIMARY KEY  (`grouproleid`)
		)".$charset
	);
}

if (!$updateManager->isInstall() && $updateManager->isUpdate('0.1.0.1')){
	$db->query_write("
		ALTER TABLE `".$db->prefix."bps_project` ADD `publish` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата публикации'"
	);
	$db->query_write("
		UPDATE ".$pfx."bps_project
		SET publish=dateline
	");
}
if ($updateManager->isUpdate('0.1.0.1')){
	// пользовательские настройки на сторонний проект
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."bps_projectconfig (
		  `projectconfigid` int(10) unsigned NOT NULL auto_increment COMMENT '',
		  `projectid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор проекта',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `subscribe` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Получить уведомление о новом комментарии к проекту',
		  PRIMARY KEY  (`projectconfigid`)
		)".$charset
	);
	$db->query_write("
		INSERT INTO ".$pfx."bps_projectconfig (projectid, userid, subscribe) 
		SELECT projectid, userid, 1 as subscribe
		FROM ".$pfx."bps_userrole
	");
}

if ($updateManager->isUpdate('0.1.0.2')){

	// пользовательские настройки группы
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."bps_groupconfig (
		  `groupconfigid` int(10) unsigned NOT NULL auto_increment COMMENT '',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `groupkey` varchar(250) NOT NULL DEFAULT '' COMMENT 'Ключ группы - сортированный список ID пользователей через пробел',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Название группы',
		  `ord` int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Сортировка',
		  `ishide` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '1=Свернуть/0=Развернуть',
		  PRIMARY KEY  (`groupconfigid`)
		)".$charset
	);
	
}

?>