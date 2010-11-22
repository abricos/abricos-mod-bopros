<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Bopros
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

/**
 * Модуль "Доска проектов" 
 */
$mod = new BoprosModule();
CMSRegistry::$instance->modules->Register($mod);

class BoprosModule extends CMSModule {
	
	private $_manager;
	
	function __construct(){
		$this->version = "0.1.0.1";
		$this->name = "bopros";
		$this->takelink = "bopros";
		
		$this->permission = new BoprosPermission($this);
	}
	
	/**
	 * Получить менеджер
	 *
	 * @return BoprosManager
	 */
	public function GetManager(){
		if (is_null($this->_manager)){
			require_once 'includes/manager.php';
			$this->_manager = new BoprosManager($this);
		}
		return $this->_manager;
	}
}

class BoprosAction {
	const VIEW			= 10;
	const WRITE			= 30;
	const ADMIN			= 50;
}

class BoprosPermission extends CMSPermission {
	
	public function BoprosPermission(BoprosModule $module){
		$defRoles = array(
			new CMSRole(BoprosAction::VIEW, 1, User::UG_GUEST),
			new CMSRole(BoprosAction::VIEW, 1, User::UG_REGISTERED),
			new CMSRole(BoprosAction::VIEW, 1, User::UG_ADMIN),

			new CMSRole(BoprosAction::WRITE, 1, User::UG_REGISTERED),
			new CMSRole(BoprosAction::WRITE, 1, User::UG_ADMIN),
			
			new CMSRole(BoprosAction::ADMIN, 1, User::UG_ADMIN)
		);
		parent::CMSPermission($module, $defRoles);
	}
	
	public function GetRoles(){
		return array(
			BoprosAction::VIEW => $this->CheckAction(BoprosAction::VIEW),
			BoprosAction::WRITE => $this->CheckAction(BoprosAction::WRITE), 
			BoprosAction::ADMIN => $this->CheckAction(BoprosAction::ADMIN) 
		);
	}
}


?>