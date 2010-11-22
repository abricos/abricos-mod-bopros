<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Bopros
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

class BoprosQuery {
	
	/**
	 * Список проектов (доска проектов) доступных пользователю
	 * @param CMSDatabase $db
	 * @param integer $userid
	 */
	public static function Board(CMSDatabase $db, $userid, $groupids){
		
		$sqlComment = "
			,(
				SELECT count(*) as cmt
				FROM ".$db->prefix."cmt_comment c
				WHERE p.contentid=c.contentid
			) as cmt
			,(
				SELECT count( c3.commentid ) AS cmtn
				FROM ".$db->prefix."cmt_comment c3
				LEFT JOIN ".$db->prefix."cmt_lastview lv ON c3.contentid = lv.contentid AND c3.commentid > lv.commentid
				WHERE p.contentid=c3.contentid AND lv.userid=".bkint($userid)."
				GROUP BY c3.contentid
			) as cmtn
			,(
				SELECT lv1.commentid AS cn
				FROM ".$db->prefix."cmt_lastview lv1
				WHERE p.contentid=lv1.contentid AND lv1.userid=".bkint($userid)."
				ORDER BY lv1.commentid DESC
				LIMIT 1
			) as cn
		";
		
		// свои проекты
		$sql = "
			SELECT
				p.projectid as id,
				p.userid as uid,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.avatar as avt,
				p.title as tl,
				p.dateline as dl,
				p.publish as pb,
				1 as r, 1 as w
				".$sqlComment.",
				0 as o
			FROM ".$db->prefix."bps_project p
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.userid=".bkint($userid)." AND p.deldate=0
		";
		
		// проекты доступные этому пользователю
		$sql .= "
			UNION
			
			SELECT
				p.projectid as id,
				p.userid as uid,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.avatar as avt,
				p.title as tl,
				0 as dl,
				p.publish as pb,
				ur.isread as r,
				ur.iswrite as w 
				".$sqlComment.",
				1 as o
			FROM ".$db->prefix."bps_userrole ur
			INNER JOIN ".$db->prefix."bps_project p ON p.projectid=ur.projectid
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE ur.userid=".bkint($userid)." AND ur.isread > 0 AND p.publish > 0 AND p.deldate=0
		";
		
		// проекты доступные группе этого пользователя
		if (!empty($groupids)){
			$where = array();
			foreach ($groupids as $groupid){
				array_push($where, "gr.groupid=".bkint($groupid)."");
			}
			
			$sql .= "
				UNION
				
				SELECT
					p.projectid as id,
					p.userid as uid,
					u.username as unm,
					u.firstname as fnm,
					u.lastname as lnm,
					u.avatar as avt,
					p.title as tl ,
					0 as dl,
					p.publish as pb,
					gr.isread as r,
					gr.iswrite as w 
					".$sqlComment.",
					2 as o
				FROM ".$db->prefix."bps_grouprole gr
				INNER JOIN ".$db->prefix."bps_project p ON p.projectid=gr.projectid
				INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
				WHERE gr.isread > 0 AND (".implode($where, " OR ").") AND p.publish > 0 AND p.deldate=0
			";
		}
		$sql .= "
			ORDER BY o, lnm, fnm, unm, pb DESC
		";
		return $db->query_read($sql);
	}
	
	public static function UserRole(CMSDatabase $db, $projectid, $userid, $groupids){
		$sql = "
			SELECT 
				ur.userroleid as id,
				'user' as tp,
				ur.isread as r,
				ur.iswrite as w
			FROM ".$db->prefix."bps_userrole ur
			WHERE ur.projectid=".bkint($projectid)." AND ur.userid=".bkint($userid)."
			LIMIT 1
		";
		if (!empty($groupids)){
			$where = array();
			foreach ($groupids as $groupid){
				array_push($where, "gr.groupid=".bkint($groupid)."");
			}
			$sql .= "
				UNION
				SELECT 
					gr.grouproleid as id,
					'group' as tp,
					gr.isread as r,
					gr.iswrite as w
				FROM ".$db->prefix."bps_grouprole gr
				WHERE gr.projectid=".bkint($projectid)." AND (".implode($where, " OR ").")
			";
		}
		
		return $db->query_read($sql);
	}
	
	
	public static function ProjectAppend(CMSDatabase $db, $prj, $pubkey){
		$contentid = CoreQuery::ContentAppend($db, $prj->bd, 'bopros');
		
		$sql = "
			INSERT INTO ".$db->prefix."bps_project (userid, title, pubkey, contentid, dateline, publish) VALUES (
				".bkint($prj->uid).",
				'".bkstr($prj->tl)."',
				'".bkstr($pubkey)."',
				".$contentid.",
				".TIMENOW.",
				".($prj->isdraft ? 0 : TIMENOW)."
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function ProjectPublish(CMSDatabase $db, $projectid){
		$sql = "
			UPDATE ".$db->prefix."bps_project
			SET publish=".TIMENOW."
			WHERE projectid=".bkint($projectid)."
		";
		$db->query_write($sql);
	}
	
	public static function ProjectRemove(CMSDatabase $db, $projectid){
		$sql = "
			UPDATE ".$db->prefix."bps_project
			SET deldate=".TIMENOW."
			WHERE projectid=".bkint($projectid)."
		";
		$db->query_write($sql);
	}
	
	public static function ProjectUpdate(CMSDatabase $db, $prj){
		$pinfo = BoprosQuery::ProjectInfo($db, $prj->id, true);
		CoreQuery::ContentUpdate($db, $pinfo['ctid'], $prj->bd);
		$pub = empty($pinfo['pb']) && empty($prj->isdraft) ? ",publish=".TIMENOW : "";
		$sql = "
			UPDATE ".$db->prefix."bps_project
			SET
				title='".bkstr($prj->tl)."'
				".$pub."
			WHERE projectid=".bkint($prj->id)."
		";
		$db->query_write($sql);
	}
	
	public static function ProjectInfo(CMSDatabase $db, $projectid, $retarray = false){
		$sql = "
			SELECT
				p.projectid as id,
				p.userid as uid,
				p.title as tl,
				p.contentid as ctid,
				p.publish as pb
			FROM ".$db->prefix."bps_project p
			WHERE projectid=".bkint($projectid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function Project(CMSDatabase $db, $projectid, $retarray = false){
		$sql = "
			SELECT
				p.projectid as id,
				p.userid as uid,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				p.title as tl,
				c.body as bd,
				p.contentid as ctid,
				p.dateline as dl,
				p.publish as pb
			FROM ".$db->prefix."bps_project p
			INNER JOIN ".$db->prefix."content c ON p.contentid=c.contentid
			LEFT JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.projectid=".bkint($projectid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	/**
	 * Получить проект по идентификатору контента
	 * @param CMSDatabase $db
	 * @param integer $contentid
	 * @param boolean $retarray
	 */
	public static function ProjectByContentId(CMSDatabase $db, $contentid, $retarray = false){
		$sql = "
			SELECT
				p.projectid as id,
				p.userid as uid,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				p.title as tl,
				c.body as bd,
				p.contentid as ctid,
				p.dateline as dl,
				p.publish as pb
			FROM ".$db->prefix."bps_project p
			INNER JOIN ".$db->prefix."content c ON p.contentid=c.contentid
			LEFT JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.contentid=".bkint($contentid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	/**
	 * Поиск пользователя по (имени и фамилиии) или логину
	 * 
	 * @param CMSDatabase $db
	 * @param integer $userid
	 * @param string $firstname
	 * @param string $lastname
	 * @param string $username
	 */
	public static function FindUser(CMSDatabase $db, $userid, $firstname, $lastname, $username){
		$where = array();
		if (!empty($firstname)){
			array_push($where, " UPPER(u.firstname)=UPPER('".bkstr($firstname)."') ");
		}
		if (!empty($lastname)){
			array_push($where, " UPPER(u.lastname)=UPPER('".bkstr($lastname)."') ");
		}
		if (!empty($username)){
			array_push($where, " UPPER(u.username)=UPPER('".bkstr($username)."') ");
		}
		array_push($where, " u.userid<>".bkint($userid));
		
		$sql = "
			SELECT
			 	u.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm
			FROM ".$db->prefix."user u
			WHERE ".implode(" AND ", $where)."
			LIMIT 50
		";
		return $db->query_read($sql);
	}
	
	public static function UserRoleAppend(CMSDatabase $db, $projectid, $userid, $isRead, $isWrite){
		$sql = "
			INSERT INTO ".$db->prefix."bps_userrole (projectid, userid, isread, iswrite) VALUES
			(
				".bkint($projectid).",
				".bkint($userid).",
				".bkint($isRead).",
				".bkint($isWrite)."
			)
		";
		$db->query_write($sql);
	}
	
	public static function UserRoleUpdate(CMSDatabase $db, $projectid, $userid, $isRead, $isWrite){
		$sql = "
			UPDATE ".$db->prefix."bps_userrole
			SET isread=".bkint($isRead).",
				iswrite=".bkint($isWrite)."
			WHERE projectid=".bkint($projectid)." AND userid=".bkint($userid)."
		";
		$db->query_write($sql);
	}
	
	public static function UserRoleRemove(CMSDatabase $db, $projectid, $userid){
		$sql = "
			DELETE FROM ".$db->prefix."bps_userrole
			WHERE projectid=".bkint($projectid)." AND userid=".bkint($userid)." 
		";
		$db->query_write($sql);
	}
	
	public static function GroupList(CMSDatabase $db){
		$sql = "
			SELECT 
				groupid as id,
				groupname as gnm
			FROM ".$db->prefix."group
			WHERE isviewbopros=1
		";
		return $db->query_read($sql);
	}
	
	public static function GroupRoleAppend(CMSDatabase $db, $projectid, $groupid, $isRead, $isWrite){
		$sql = "
			INSERT INTO ".$db->prefix."bps_grouprole (projectid, groupid, isread, iswrite) VALUES
			(
				".bkint($projectid).",
				".bkint($groupid).",
				".bkint($isRead).",
				".bkint($isWrite)."
			)
		";
		$db->query_write($sql);
	}
	
	public static function GroupRoleUpdate(CMSDatabase $db, $projectid, $groupid, $isRead, $isWrite){
		$sql = "
			UPDATE ".$db->prefix."bps_grouprole
			SET isread=".bkint($isRead).",
				iswrite=".bkint($isWrite)."
			WHERE projectid=".bkint($projectid)." AND groupid=".bkint($groupid)."
		";
		$db->query_write($sql);
	}
	
	public static function GroupRoleRemove(CMSDatabase $db, $projectid, $groupid){
		$sql = "
			DELETE FROM ".$db->prefix."bps_grouprole
			WHERE projectid=".bkint($projectid)." AND groupid=".bkint($groupid)." 
		";
		$db->query_write($sql);
	}
	
	/**
	 * Список пользователей и их права в проекте
	 * @param CMSDatabase $db
	 * @param integer $projectid
	 */
	public static function ProjectUserList(CMSDatabase $db, $projectid){
		$sql = "
			SELECT 
				p.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				p.isread as r,
				p.iswrite as w
			FROM ".$db->prefix."bps_userrole p
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.projectid=".bkint($projectid)."
		";
		return $db->query_read($sql);
	}
	
	/**
	 * Список пользователей и их права на создаваемый проект
	 * @param CMSDatabase $db 
	 * @param integer $userid
	 */
	public static function ProjectUserListDefault(CMSDatabase $db, $userid){
		$sql = "
			SELECT 
				u.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				0 as r, 0 as w
			FROM ".$db->prefix."bps_userrole ur
			INNER JOIN ".$db->prefix."user u ON ur.userid=u.userid
			LEFT JOIN ".$db->prefix."bps_project p ON p.projectid=ur.projectid 
			GROUP BY ur.userid
			LIMIT 10
		";
		return $db->query_read($sql);
	}

	/**
	 * Список групп и их права в проекте 
	 * @param CMSDatabase $db
	 * @param integer $projectid
	 */
	public static function ProjectGroupList(CMSDatabase $db, $projectid){
		$sql = "
			SELECT 
				gr.groupid as id,
				g.groupname as gnm,
				gr.isread as r,
				gr.iswrite as w
			FROM ".$db->prefix."bps_grouprole gr
			INNER JOIN ".$db->prefix."group g ON gr.groupid=g.groupid
			WHERE gr.projectid=".bkint($projectid)."
		";
		return $db->query_read($sql);
	}
	
	/**
	 * Список групп на создаваемый проект
	 * 
	 * @param CMSDatabase $db 
	 * @param integer $groupid
	 */
	public static function ProjectGroupListDefault(CMSDatabase $db, $userid){
		$sql = "
			SELECT 
				gr.groupid as id,
				g.groupname as gnm,
				0 as r, 0 as w
			FROM ".$db->prefix."bps_grouprole gr
			INNER JOIN ".$db->prefix."group g ON gr.groupid=g.groupid
			LEFT JOIN ".$db->prefix."bps_project p ON p.projectid=gr.projectid
			WHERE p.userid=".bkint($userid)."
			GROUP BY gr.groupid
			LIMIT 10
		";
		return $db->query_read($sql);
	}

	public static function ProjectConfigAppend(CMSDatabase $db, $projectid, $userid, $subscribe){
		if (empty($userid) || empty($projectid)){ return 0; }
		$sql = "
			INSERT INTO ".$db->prefix."bps_projectconfig (projectid, userid, subscribe) VALUES (
				".bkint($projectid).",
				".bkint($userid).",
				".bkint($subscribe)."
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function ProjectSubscribeUserList(CMSDatabase $db, $projectid){
		$sql = "
			SELECT
				c.userid as id,
				u.email as email 
			FROM ".$db->prefix."bps_projectconfig c
			INNER JOIN ".$db->prefix."user u ON c.userid=u.userid
			WHERE c.projectid=".bkint($projectid)." AND c.subscribe=1
			GROUP BY c.userid
		";
		return $db->query_read($sql);
	}
}

?>