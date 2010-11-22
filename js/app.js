/*
@version $Id$
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = { 
	mod:[{name: 'webos', files: ['os.js']}]
};
Component.entryPoint = function(){
	
	if (Brick.Permission.check('bopros', '10') != 1){ return; }
	
	var os = Brick.mod.webos;
	
	var app = new os.Application(this.moduleName);
	app.icon = '/modules/bopros/images/app_icon.gif';
	app.entryComponent = 'project';
	app.entryPoint = 'Brick.mod.bopros.API.runApplication';
	
	os.ApplicationManager.register(app);
	
	/*
	var NS = this.namespace;
	var API = NS.API;
	os.ApplicationManager.startupRegister(function(){
		Brick.f('bopros', 'project', 'showBoardPanel', 0);
	});
	/**/
};
