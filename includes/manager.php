<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Bopros
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

require_once 'dbquery.php';

class BoprosManager extends Ab_ModuleManager {
	
	/**
	 * 
	 * @var BoprosModule
	 */
	public $module = null;
	
	public function __construct(BoprosModule $module){
		parent::__construct($module);
	}
	
	public function IsAdminRole(){
		return $this->IsRoleEnable(BoprosAction::ADMIN);
	}
	
	public function IsWriteRole(){
		return $this->IsRoleEnable(BoprosAction::WRITE);
	}
	
	public function IsViewRole(){
		return $this->IsRoleEnable(BoprosAction::VIEW);
	}
	
	public function DSProcess($name, $rows){
		$p = $rows->p;
		$db = $this->db;
		
		switch ($name){
		}
	}
	
	public function DSGetData($name, $rows){
		$p = $rows->p;
		switch ($name){
			case 'board': return $this->Board();
			case 'boardusers': return $this->BoardUsers();
			case 'boardprojectusers': return $this->BoardProjectUsers();
			case 'grouplist': return $this->GroupList();
		}
		return null;
	}
	
	public function AJAX($d){
		switch($d->do){
			case 'finduser': return $this->FindUser($d->firstname, $d->lastname, $d->username, true);
			case 'project': return $this->Project($d->projectid);
			case 'projectsave': return $this->ProjectSave($d->project);
			case 'projectpublish': return $this->ProjectPublish($d->projectid);
			case 'projectremove': return $this->ProjectRemove($d->projectid);
			case 'userappendincloud': return $this->CloudUserAppend($d->userid, $d->cloudkey, $d->prjs);
		}
		return null;
	}
	
	/**
	 * Добавить нового участника в облако пользователей
	 * 
	 * @param integer $newuserid идентификатор пользователя
	 * @param string $cloudkey ключ, идентификаторы участников разделенные пробелом 
	 * @param string $projects идентификаторы проектов разделенные пробелом 
	 */
	public function CloudUserAppend($newuserid, $cloudkey, $projects){
		// в текущей версии доступно только для администратора "Доски проектов"
		if (!$this->IsAdminRole()){ return null; }

		// составить список проектов, которые видны этой группе участников
		// и в каждый этот проект добавить нового участника

		$uids = explode(" ", $cloudkey);
		$prjs = explode(" ", $projects);
		
		$bpUsers = $this->BoardProjectUsers(true);
		
		print_r($bpUsers);
		
		foreach ($prjs as $pid){
			BoprosQuery::UserRoleAppend($this->db, $pid, $newuserid, 1, 1);
		}
	}
		
	/**
	 * Список проектов доступные этому пользователю включая свои
	 * со списком пользователей на каждый проект и их роли
	 * 
	 * @param boolean $retarray
	 * @return указатель на выборку из базы
	 */
	public function BoardProjectUsers($retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$groupids = $this->user->info['group'];
		$rows = BoprosQuery::BoardProjectUsers($this->db, $this->userid, $groupids);
		return $retarray ? $this->ToArray($rows) : $rows; 
	}
	
	/**
	 * Список пользователей участвующих на доске проектов этого пользователя
	 */
	public function BoardUsers($retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BoprosQuery::BoardUsers($this->db, $this->userid);
		return $retarray ? $this->ToArray($rows) : $rows; 
	}
	
	/**
	 * Доска проектов - список проектов доступных пользователю
	 */
	public function Board($retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$groupids = $this->user->info['group'];
		$rows = BoprosQuery::Board($this->db, $this->userid, $groupids);
		return $retarray ? $this->ToArray($rows) : $rows; 
	}
	
	public function MyProjectInfo($projectid){
		if (!$this->IsWriteRole()){ return null; }
		$pinfo = BoprosQuery::ProjectInfo($this->db, $projectid, true);
		if (empty($pinfo) || $pinfo['uid'] != $this->userid){ return null; }
		return $pinfo;
	}
	
	
	public function ProjectPublish($projectid){
		$pinfo = $this->MyProjectInfo($projectid);
		if (empty($pinfo)){ return null; }
		
		if ($pinfo['pb'] > 0){ return null; }
		
		BoprosQuery::ProjectPublish($this->db, $projectid);
		
		$this->ProjectSendNotify($projectid);
		return $this->Project($projectid);
	}
	
	public function ProjectRemove($projectid){
		$pinfo = $this->MyProjectInfo($projectid);
		if (empty($pinfo)){ return null; }
		BoprosQuery::ProjectRemove($this->db, $projectid);
		return 1;
	}
	
	public function ProjectSave($prj){
		if (!$this->IsWriteRole()){ return null; }
		$prj->id = intval($prj->id);
		if (!$this->IsAdminRole()){
			// порезать теги и прочие гадости
			$utmanager = Abricos::TextParser();
			$prj->tl = $utmanager->Parser($prj->tl);
			$prj->bd = $utmanager->Parser($prj->bd);
		}
		
		$publish = false;
		
		if ($prj->id == 0){
			$prj->uid = $this->userid;
			$pubkey = md5(time().$this->userid);
			$prj->id = BoprosQuery::ProjectAppend($this->db, $prj, $pubkey);
			$publish = empty($prj->isdraft);
		}else{
			// является ли пользователь вледельцем данного проекта
			$pinfo = BoprosQuery::ProjectInfo($this->db, $prj->id, true);
			if (empty($pinfo) || $pinfo['uid'] != $this->userid){ return null; }
			if ($pinfo['pb'] > 0){
				$prj->isdraft = false;
			}
			$publish = empty($pinfo['pb']) && empty($prj->isdraft);
			BoprosQuery::ProjectUpdate($this->db, $prj);
		}
		
		$sendNotify = $publish;
		
		$users = $this->ProjectUserList($prj->id, true);

		$arr = get_object_vars($prj->users);
		// обновить информацию по правам пользователей
		foreach ($users as $cuser){
			$rUserId = $cuser['id'];
			$u = &$arr[$rUserId];
			if (empty($u)){
				BoprosQuery::UserRoleRemove($this->db, $prj->id, $rUserId);
			}else{
				BoprosQuery::UserRoleUpdate($this->db, $prj->id, $rUserId, $u->r, $u->w);
				$u->f = 'u';
			}
		}
		foreach ($arr as $u){
			if (empty($u->f)){
				BoprosQuery::UserRoleAppend($this->db, $prj->id, $u->id, $u->r, $u->w);
			}
		}
		
		// обновить информацию по правам групп
		$groups = $this->ProjectGroupList($prj->id, true);
		$arr = get_object_vars($prj->groups);
		foreach ($groups as $cgroup){
			$rGroupId = $cgroup['id'];
			$g = &$arr[$rGroupId];
			if (empty($g)){
				BoprosQuery::GroupRoleRemove($this->db, $prj->id, $rGroupId);
			}else{
				BoprosQuery::GroupRoleUpdate($this->db, $prj->id, $rGroupId, $g->r, $g->w);
				$g->f = 'u';
			}
		}
		foreach ($arr as $g){
			if (empty($g->f)){
				BoprosQuery::GroupRoleAppend($this->db, $prj->id, $rGroupId, $g->r, $g->w);
			}
		}
		$project = $this->Project($prj->id); 
		if ($sendNotify){
			$this->ProjectSendNotify($prj->id);
		}
		
		return $project;
	}
	
	/**
	 * Отправить приглашение всем пользователям проекта
	 * @param integer $projectid идентификатор проекта
	 * @param integer $userid Если > 0, то отправить приглашение только этому пользователю
	 */
	public function ProjectSendNotify($projectid, $userid = 0){
		$project = $this->Project($projectid);
		 
		// подписать пользователя и отправить ему уведомление
		$brick = Brick::$builder->LoadBrickS('bopros', 'templates', null, null);
		$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
		$plnk = "http://".$host."/webos/start/bopros/project/showProjectPanel/".$projectid."/";
		
		$users = $this->ProjectUserList($projectid, true);
		foreach($users as $ur){
			if ($userid > 0 && $ur['id']*1 != $userid*1){ continue; }
			
			BoprosQuery::ProjectConfigAppend($this->db, $projectid, $ur['id'], 1);
			
			$user = UserQuery::User($this->db, $ur['id']);
			$email = $user['email'];
			if (empty($email)){ continue; }
			
			$subject = Brick::ReplaceVarByData($brick->param->var['newprojectsubject'], array(
				"tl" => $project->tl
			));
			$body = Brick::ReplaceVarByData($brick->param->var['newprojectbody'], array(
				"tl" => $project->tl,
				"plnk" => $plnk,
				"unm" => $this->user->info['username'],
				"prj" => $project->bd,
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
			));
			Abricos::Notify()->SendMail($email, $subject, $body);
		}
	}
	
	public function Project($projectid){
		$projectid = intval($projectid);
		if (!$this->IsViewRole()){ return null; }
		
		$project = new stdClass();
		// идентификатор проекта
		$project->id = $projectid;
		// заголовок проекта
		$project->tl = "";
		// контент проекта
		$project->bd = "";
		// идентификатор контента
		$project->ctid = 0;
		// доступ на чтение
		$project->r = 0;
		// доступ на запись комментария
		$project->w = 0;

		// автор проекта
		$project->unm = '';
		$project->fnm = '';
		$project->lnm = '';

		// дата создания проекта
		$project->dl = 0;
		
		// дата публикации проекта
		$project->pb = 0;
		
		$project->users = array();
		$project->groups = array();
		
		if ($projectid > 0){
			$pbd = BoprosQuery::Project($this->db, $projectid, true);
			
			if ($pbd['uid'] != $this->userid){
				if (empty($pbd['pb'])){
					// проект не опубликован 
					return null; 
				}
				$role = $this->ProjectUserRole($projectid);
				if ($role['w'] == 0 && $role['r'] == 0){ return null; }
				$project->r = $role['r'];
				$project->w = $role['w'];
			}else{
				// автор запрашивает проект
				$project->r = 1;
				$project->w = 1;
			}
			$project->users = $this->ToArray(BoprosQuery::ProjectUserList($this->db, $projectid));
			$project->groups = $this->ToArray(BoprosQuery::ProjectGroupList($this->db, $projectid));
			
			$project->tl = $pbd['tl'];
			$project->bd = $pbd['bd'];
			$project->ctid = $pbd['ctid'];
			$project->unm = $pbd['unm'];
			$project->fnm = $pbd['fnm'];
			$project->lnm = $pbd['lnm'];
			$project->dl = $pbd['dl'];
			$project->pb = $pbd['pb'];
		}else{
			// попытка получить проект по шаблону, а есть ли права?
			if (!$this->IsWriteRole()){ return null; }
			// $project->users = $this->ToArray(BoprosQuery::ProjectUserListDefault($this->db, $projectid));
			// $project->groups = $this->ToArray(BoprosQuery::ProjectGroupListDefault($this->db, $projectid));
			$project->users = array();
			$project->groups = array();
		}
		
		return $project;
	}

	/**
	 * Роль текущего пользователя в проекте 
	 * @param integer $projectid
	 */
	public function ProjectUserRole($projectid){
		$w = 0; $r = 0; 
		$rows = BoprosQuery::UserRole($this->db, $projectid, $this->userid, $this->user->info['group']);
		while (($row = $this->db->fetch_array($rows))){
			$r = $row['r'] || $r;
			$w = $row['w'] || $w;
		}
		return array('r'=>$r, 'w'=>$w);
	}
	
	public function GroupList(){
		if (!$this->IsWriteRole()){ return null; }
		return BoprosQuery::GroupList($this->db);
	}
	
	private function ToArray($rows){
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			$ret[$row['id']] = $row;
		}
		return $ret;
	}
	
	public function ProjectUserList($projectid, $retarray = false){
		if (!$this->IsWriteRole()){ return null; }
		$rows = null;
		if (empty($projectid)){
			$rows = BoprosQuery::ProjectUserListDefault($this->db, $this->userid);
		}else{
			$rows = BoprosQuery::ProjectUserList($this->db, $projectid);
		}
		if (!$retarray){ return $rows; }
		return $this->ToArray($rows);
	}
	
	public function ProjectGroupList($projectid, $retarray = false){
		if (!$this->IsWriteRole()){ return null; }
		$rows = null;
		if (empty($projectid)){
			$rows = BoprosQuery::ProjectGroupListDefault($this->db, $this->userid);
		}else{
			$rows = BoprosQuery::ProjectGroupList($this->db, $projectid);
		}
		if (!$retarray){ return $rows; }
		return $this->ToArray($rows);
	}
	
	
	public function FindUser($firstname, $lastname, $username, $retarray = false){
		if (!(!empty($firstname) || !empty($lastname) || !empty($username))){ return null; }
		
		if (!$this->IsWriteRole()){ return null; }
		$rows = BoprosQuery::FindUser($this->db, $this->userid, $firstname, $lastname, $username);
		if (!$retarray){
			return $rows;
		}
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			$ret[$row['id']] = $row;
		}
		return $ret;
	}
	
	// комментарии
	
	public function IsCommentList($contentid){
		$project = BoprosQuery::ProjectByContentId($this->db, $contentid, true);
		if (empty($project)){ return false; }
		if ($project['uid'] == $this->userid){ return true; }
		$role = $this->ProjectUserRole($project['id']);
		return ($role['r'] > 0 || $role['w'] > 0);
	}
	
	public function IsCommentAppend($contentid){
		$project = BoprosQuery::ProjectByContentId($this->db, $contentid, true);
		if (empty($project)){ return false; }
		if ($project['uid'] == $this->userid){ return true; }
		$role = $this->ProjectUserRole($project['id']);
		return ($role['w'] > 0);
	}
	
	/**
	 * Отправить уведомление о новом комментарии.
	 * 
	 * @param object $data
	 */
	public function CommentSendNotify($data){
		
		// данные по комментарию:
		// $data->id	- идентификатор комментария
		// $data->pid	- идентификатор родительского комментария
		// $data->uid	- пользователь оставивший комментарий
		// $data->bd	- текст комментария
		// $data->cid	- идентификатор контента
		
		$prj = BoprosQuery::ProjectByContentId($this->db, $data->cid, true);
		if (empty($prj)){ return; }
		
		$emails = array();
		
		$brick = Brick::$builder->LoadBrickS('bopros', 'templates', null, null);
		$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
		$plnk = "http://".$host."/webos/start/bopros/project/showProjectPanel/".$prj['id']."/";
		
		// уведомление "комментарий на комментарий"
		if ($data->pid > 0){
			$parent = CommentQuery::Comment($this->db, $data->pid, $data->cid, true);
			if (!empty($parent) && $parent['uid'] != $this->userid){
				$user = UserQuery::User($this->db, $parent['uid']);
				$email = $user['email'];
				if (!empty($email)){
					$emails[$email] = true;
					$subject = Brick::ReplaceVarByData($brick->param->var['cmtemlsubject'], array(
						"tl" => $prj['tl']
					));
					$body = Brick::ReplaceVarByData($brick->param->var['cmtemlbody'], array(
						"tl" => $prj['tl'],
						"plnk" => $plnk,
						"unm" => $this->user->info['username'],
						"cmt1" => $parent['bd']." ",
						"cmt2" => $data->bd." ",
						"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
					));
					Abricos::Notify()->SendMail($email, $subject, $body);
				}
			}
		}
		
		// уведомление автору
		if ($prj['uid'] != $this->userid){
			$autor = UserQuery::User($this->db, $prj['uid']);
			$email = $autor['email'];
			if (!empty($email) && !$emails[$email]){
				$emails[$email] = true;
				$subject = Brick::ReplaceVarByData($brick->param->var['cmtemlautorsubject'], array(
					"tl" => $prj['tl']
				));
				$body = Brick::ReplaceVarByData($brick->param->var['cmtemlautorbody'], array(
					"tl" => $prj['tl'],
					"plnk" => $plnk,
					"unm" => $this->user->info['username'],
					"cmt" => $data->bd." ",
					"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
				));
				Abricos::Notify()->SendMail($email, $subject, $body);
			}
		}
		
		// уведомление подписчикам
		$users = $this->ToArray(BoprosQuery::ProjectSubscribeUserList($this->db, $prj['id']));
		foreach ($users as $user){
			$email = $user['email'];
			
			if (empty($email) || $emails[$email] || $user['id'] == $this->userid){
				continue;
			}
			$emails[$email] = true;
			$subject = Brick::ReplaceVarByData($brick->param->var['cmtemlsubject'], array(
				"tl" => $prj['tl']
			));
			$body = Brick::ReplaceVarByData($brick->param->var['cmtemlbody'], array(
				"tl" => $prj['tl'],
				"plnk" => $plnk,
				"unm" => $this->user->info['username'],
				"cmt" => $data->bd." ",
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
			));
			Abricos::Notify()->SendMail($email, $subject, $body);
		}
	}
}

?>