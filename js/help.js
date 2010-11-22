/*
@version $Id: project.js 694 2010-08-26 07:31:16Z roosit $
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	yahoo: ['dom', 'dragdrop'],
	mod:[
	     {name: 'sys', files: ['container.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template; 
	
	var API = NS.API;
		
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};
	
	Brick.util.CSS.update(Brick.util.CSS['bopros']['help']);
	
	var HelpPanel = function(){
		HelpPanel.superclass.constructor.call(this, {
			fixedcenter: true, height: '480px', width: '800px'
		});
	};
	YAHOO.extend(HelpPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'helppanel');
			return this._T['helppanel'];
		}
	});	
	
	NS.HelpPanel = HelpPanel;
	API.showHelpPanel = function(){
		new HelpPanel();
	};
};