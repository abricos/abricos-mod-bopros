/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	yahoo: ['dom', 'dragdrop'],
	mod:[
        {name: 'user', files: ['permission.js']},
		{name: 'sys', files: ['data.js', 'container.js','wait.js','editor.js']},
        {name: 'uprofile', files: ['viewer.js']},
        {name: 'bopros', files: ['roles.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template,
		API = NS.API,
		R = NS.roles;
	
	var UP = Brick.mod.uprofile;

	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('bopros');
	}
	var DATA = NS.data;
	
	var CACHE = {
		'project': {},
		set: function(project){
			if (L.isNull(project)){ return; }
			CACHE.project[project.id] = project;
		},
		get: function(id){
			return CACHE.project[id];
		}
	};
	NS.CACHE = CACHE;
	
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};
	
	var buildUserName = function(user){
		var emp = function(s){
			s = s || '';
			return s.length < 1;
		};
		return (emp(user['fnm']) && emp(user['lnm'])) ? user['unm'] : user['fnm'] + ' ' + user['lnm']; 
	};
	
	var ProjectWidget = function(container, project, config){
		config = L.merge({
			'onLoadComments': null
		}, config || {});
		this.init(container, project, config);
	};
	ProjectWidget.prototype = {
		init: function(container, project, config){
			this.project = project;
			this.config = config;
			buildTemplate(this, 'prjwidget');
			
			var TM = this._TM, 
				ispub = project.pb > 0;
				
			container.innerHTML = TM.replace('prjwidget', {
				'unm': buildUserName(project),
				'pb': ispub ? Brick.dateExt.convert(project.pb) : '',
				'ispb': ispub ? 'none' : '',
				'tl': project.tl,
				'bd': project.bd
			});
			
			var __self = this;
			
			var scrollToComment = function(commentid, builder){
				__self.scrollToComment(commentid, builder);
				return true;
			};
			Brick.ff('comment', 'comment', function(){
				Brick.mod.comment.API.buildCommentTree({
					'container': TM.getEl('prjwidget.comment'),
					'dbContentId': project.ctid,
					'config': {
						'onLoadComments': config['onLoadComments'],
						'readOnly': project.w*1 == 0,
						'manBlock': new Brick.mod.comment.ManagerBlockWidget(
							TM.getEl('prjwidget.manblock'),
							'position: absolute; right: 16px; top: 43%;',
							scrollToComment
						)
					},
					'instanceCallback': function(b){ }
				});
			});
		},
		destroy: function(){},
		scrollToComment: function(commentid, builder){
			var el = builder.getCommentElement(commentid),
				TM = this._TM;
			
			var container = TM.getEl('prjwidget.container'),
				list = TM.getEl('prjwidget.list');
			var r1 = Dom.getRegion(container),
				r2 = Dom.getRegion(list),
				r3 = Dom.getRegion(el);
			
			var h = r3.top-r2.top;
			container.scrollTop = h;
		},
		onClick: function(el){
			switch(el.id){
			case this._TId['prjwidget']['broles']: 
				this.showRoles();  
				return true;
			}

			return false;
		},
		onResize: function(rel){
			var el = this._TM.getEl('prjwidget.container');
			el.style.height = (rel.height - 70)+'px';
		},
		showRoles: function(){
			new ProjectRolePanel(this.project);
		}
	};
	NS.ProjectWidget = ProjectWidget;
	
	var ProjectPanel = function(project, overconfig){
		this.project = project;
		this.overconfig = L.merge({
			'onLoadComments': null
		}, overconfig || {});
		ProjectPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '780px', height: '500px',
			controlbox: 1
			// ,state: Brick.widget.Panel.STATE_MAXIMIZED
		});
	};
	YAHOO.extend(ProjectPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjpanel');
			return this._TM.replace('prjpanel', {
				'tl': this.project.tl
			});
		},
		onLoad: function(){
			this.projectWidget = new ProjectWidget(this._TM.getEl('prjpanel.widget'), this.project, this.overconfig);
		},
		destroy: function(){
			this.projectWidget.destroy();
			ProjectPanel.superclass.destroy.call(this);
		},
		onClick: function(el){
			if (this.projectWidget.onClick(el)){ return true;}
			return false;
		},
		onResize: function(){
			this.projectWidget.onResize(Dom.getRegion(this.body));
		}
	});
	NS.ProjectPanel = ProjectPanel;
	
	var showProjectPanel = function(project, config){
		if (L.isNull(project)){
			return new ProjectPanel404();
		}else{
			return new ProjectPanel(project, config);
		}
	};
	
	API.showProjectPanel = function(projectid, config){
		if (CACHE.project[projectid]){
			showProjectPanel(CACHE.project[projectid], config);
			return;
		}
		R.load(function(){
			Brick.widget.LoadPanel.show();
			
			Brick.ajax('bopros', {
				'data': {
					'do': 'project',
					'projectid': projectid
				},
				'event': function(request){
					var project = request.data;
					if (projectid > 0){
						CACHE.project[projectid] = project;
					}
					Brick.widget.LoadPanel.hide();
					showProjectPanel(CACHE.project[projectid], config);
				}
			});
		});
	};
	
	var ProjectPanel404 = function(){
		ProjectPanel404.superclass.constructor.call(this, {fixedcenter: true, width: '500px'});
	};
	YAHOO.extend(ProjectPanel404, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjpanel404');
			return this._TM.replace('prjpanel404');

		}
	});
	NS.ProjectPanel404 = ProjectPanel404;
	
	var ProjectRolePanel = function(project){
		this.project = project;
		ProjectRolePanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '500px'
		});
	};
	YAHOO.extend(ProjectRolePanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjrolepanel');
			return this._TM.replace('prjrolepanel', {
				'tl': this.project.tl
			});
		},
		onLoad: function(){
			this.widget = new ProjectRoleWidget(this._TM.getEl('prjrolepanel.widget'), this.project, this.overconfig);
		}
	});
	NS.ProjectRolePanel = ProjectRolePanel;
	
	
	var ProjectRoleWidget = function(container, project){
		this.init(container, project);
	};
	ProjectRoleWidget.prototype = {
		init: function(container, project){
			this.project = project;
			buildTemplate(this, 'prjrolewidget,prjrolerow');
			
			var TM = this._TM, lst = "";
			
			var users = project.users;
			for (var id in users){
				var di = users[id];
				lst += TM.replace('prjrolerow', {
					'id': id, 
					'nm': UP.viewer.buildUserName(di),
					'r': di['r']*1 > 0 ? 'checked' : '',
					'w': di['w']*1 > 0 ? 'checked' : ''
				});
			}
			var groups = project.groups;
			for (var id in groups){
				var di = groups[id];
				lst += TM.replace('prjrolerow', {
					'id': id, 'nm': di['gnm'],
					'r': di['r']*1 > 0 ? 'checked' : '',
					'w': di['w']*1 > 0 ? 'checked' : ''
				});
			}
			
			container.innerHTML = TM.replace('prjrolewidget', {
				'tl': project.tl,
				'rows': lst
			});
		}
	};
	NS.ProjectRoleWidget = ProjectRoleWidget;	
	
	var ProjectEditorWidget = function(container, project){
		this.init(container, project);
	};
	ProjectEditorWidget.prototype = {
		init: function(container, project){
			this.project = project;
			buildTemplate(this, 'prjeditwidget,prjedtableusr,prjedrowwaitusr,prjedrowusr,prjedtablegrp,prjedrowwaitgrp,prjedrowgrp');
			var TM = this._TM;
			container.innerHTML = TM.replace('prjeditwidget');
			
			var Editor = Brick.widget.Editor;
			this.editor = new Editor(this._TId['prjeditwidget']['editor'], {
				width: '750px', height: '250px', 'mode': Editor.MODE_VISUAL
			});
			
			TM.getEl('prjeditwidget.tl').value = project.tl;
			this.editor.setContent(project.bd);
			
			this.renderUsers();
			this.renderGroups();
		},
		destroy: function(){ },
		renderUsers: function(){
			var TM = this._TM, T = this._T, lst = "";
			var users = this.project.users;
			for (var id in users){
				var di = users[id];
				lst += TM.replace('prjedrowusr', {
					'id': id, 'unm': buildUserName(di),
					'r': di['r']*1 > 0 ? 'checked' : '',
					'w': di['w']*1 > 0 ? 'checked' : ''
				});
			}
			TM.getEl('prjeditwidget.tableusr').innerHTML = TM.replace('prjedtableusr', {'rows': lst});
		},
		renderGroups: function(){
			var TM = this._TM, T = this._T, lst = "";
			var groups = this.project.groups;
			for (var id in groups){
				var di = groups[id];
				lst += TM.replace('prjedrowgrp', {
					'id': id, 'gnm': di['gnm'],
					'r': di['r']*1 > 0 ? 'checked' : '',
					'w': di['w']*1 > 0 ? 'checked' : ''
				});
			}
			TM.getEl('prjeditwidget.tablegrp').innerHTML = TM.replace('prjedtablegrp', {'rows': lst});
		},
		appendUser: function(user){
			user = L.merge({ 'r': 0, 'w': 0 }, user || {});
			this.project.users[user.id] = user;
			this.renderUsers();
		},
		appendGroup: function(group){
			group = L.merge({ 'r': 0, 'w': 0 }, group || {});
			this.project.groups[group.id] = group;
			this.renderGroups();
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['prjeditwidget'], __self = this;
			switch(el.id){
			case tp['badduser']:
				new UserAppendPanel(function(user){
					__self.appendUser(user);
				});
				return true;
			case tp['baddgroup']:
				new GroupAppendPanel(function(group){
					__self.appendGroup(group);
				});
				return true;
			}

			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			switch(prefix){
				case (TId['prjedrowusr']['remove']+'-'): this.removeUserRole(numid); return true;			
				case (TId['prjedrowgrp']['remove']+'-'): this.removeGroupRole(numid); return true;
			}
			return false;
		},
		removeUserRole: function(userid){
			delete this.project.users[userid];
			this.renderUsers();
		},		
		removeGroupRole: function(userid){
			delete this.project.groups[userid];
			this.renderGroups();
		},
		save: function(draft){
			draft = draft || false;
			var TM = this._TM, TId = this._TId;
			
			var prj = {
				'id': this.project.id,
				'tl': TM.getEl('prjeditwidget.tl').value,
				'bd': this.editor.getContent(),
				'isdraft': draft,
				users: {},
				groups: {}
			};
			
			for (var id in this.project.users){
				var user = this.project.users[id];
				prj.users[id] = {
					'id': id,
					'r': Dom.get(TId['prjedrowusr']['r']+'-'+id).checked ? 1 : 0,
					'w': Dom.get(TId['prjedrowusr']['w']+'-'+id).checked ? 1 : 0
				};
			}
			for (var id in this.project.groups){
				var group = this.project.groups[id];
				prj.groups[id] = {
					'id': id,
					'r': Dom.get(TId['prjedrowgrp']['r']+'-'+id).checked ? 1 : 0,
					'w': Dom.get(TId['prjedrowgrp']['w']+'-'+id).checked ? 1 : 0
				};
			}
			Brick.widget.LoadPanel.show();
			Brick.ajax('bopros', {
				'data': {
					'do': 'projectsave',
					'project': prj
				},
				'event': function(request){
					Brick.widget.LoadPanel.hide();
					var project = request.data;
					if (!L.isNull(project)){
						CACHE.project[project.id] = project;
					}
					
					if (!L.isNull(DATA.get('board'))){
						DATA.get('board').clear();
						DATA.request();
					}
					
				}
			});
			return true;
		}
	};
	NS.ProjectEditorWidget = ProjectEditorWidget;
	
	var ProjectEditorPanel = function(project){
		this.project = project;
		ProjectEditorPanel.superclass.constructor.call(this, {
			fixedcenter: true
		});
	};
	YAHOO.extend(ProjectEditorPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjeditpanel');
			return this._TM.replace('prjeditpanel');
		},
		onLoad: function(){
			var TM = this._TM;
			if (this.project.pb > 0){
				TM.getEl('prjeditpanel.bsave').style.display = '';
			}else{
				TM.getEl('prjeditpanel.bsavepub').style.display = '';
				TM.getEl('prjeditpanel.bsavedraft').style.display = '';
			}

			this.projectEditWidget = new ProjectEditorWidget(this._TM.getEl('prjeditpanel.widget'), this.project);
		},
		onClick: function(el){
			if (this.projectEditWidget.onClick(el)){ return true; }
			var tp = this._TId['prjeditpanel'];
			switch(el.id){
			case tp['bsave']: 
			case tp['bsavepub']: this.saveProject(); return true;
			case tp['bsavedraft']: this.saveProject(true); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		},
		saveProject: function(draft){
			if (this.projectEditWidget.save(draft)){
				this.close();
			} 
		},
		destroy: function(){
			this.projectEditWidget.destroy();
			ProjectEditorPanel.superclass.destroy.call(this);
		}
	});
	NS.ProjectEditorPanel = ProjectEditorPanel;

	API.showProjectEditorPanel = function(projectid){
		if (CACHE.project[projectid]){
			new ProjectEditorPanel(CACHE.project[projectid]);
			return;
		}
		R.load(function(){
			Brick.widget.LoadPanel.show();
			
			Brick.ajax('bopros', {
				'data': {
					'do': 'project',
					'projectid': projectid
				},
				'event': function(request){
					var project = request.data;
					if (projectid > 0){
						CACHE.project[projectid] = project;
					}
					Brick.widget.LoadPanel.hide();
					new ProjectEditorPanel(project);
				}
			});
		});
	};
	
	var GroupAppendPanel = function(callback){
		this.callback = callback;
		GroupAppendPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '400px', modal: true
		});
	};
	YAHOO.extend(GroupAppendPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'groupappanel,groupaptable,groupaprow,groupaprowwait');
			return this._TM.replace('groupappanel');
		},
		onLoad: function(){
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill({
				'grouplist': DATA.get('grouplist', true)
			}) ? this.renderTable() : this.renderWait();
			DATA.request();
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('grouplist', {})){
				type == 'onComplete' ? this.renderTable() : this.renderWait(); 
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
			GroupAppendPanel.superclass.destroy.call(this);
		},
		renderWait: function(){
			var TM = this._TM, T = this._T;
			TM.getEl('groupappanel.table').innerHTML = TM.replace('groupaptable', {'rows': T['groupaprowwait']});
		},
		renderTable: function(){
			var lst = "", TM = this._TM, T = this._T;

			DATA.get('grouplist').getRows().foreach(function(row){
				var di = row.cell;
				lst += TM.replace('groupaprow', {
					'id': row.id,
					'gnm': di['gnm']
				});
			});
			this._TM.getEl('groupappanel.table').innerHTML = TM.replace('groupaptable', {'rows': lst});
		},	
		onClick: function(el){
			var TId = this._TId;
			var tp = TId['groupappanel'];
			switch(el.id){
			case tp['bclose']: this.close(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			switch(prefix){
			case (TId['groupaprow']['append']+'-'):
				if (L.isFunction(this.callback)){
					var group = DATA.get('grouplist').getRows().getById(numid).cell;
					this.callback(group);
				}
				this.close();
				return true;
			}
			return false;
		}
	});
	NS.GroupAppendPanel = GroupAppendPanel;

	API.showGroupAppendPanel = function(callback){
		new NS.GroupAppendPanel(callback);
	};
	
	var UserAppendPanel = function(callback){
		this.callback = callback || function(){};
		UserAppendPanel.superclass.constructor.call(this, {
			fixedcenter: true, modal: true
		});
	};
	YAHOO.extend(UserAppendPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'finduserpanel,firestable,firesrow,firesrowwait');
			return this._TM.replace('finduserpanel');
		},
		onLoad: function(){
			this._TM.getEl('finduserpanel.result').innerHTML = this._TM.replace('firestable', {'rows': ''});
		},
		renderUsers: function(users){
			if (L.isNull(users)){ return; }
			this.users = users;
			
			var TM = this._TM, T = this._T, 
				lst = "";

			for (var id in users){
				var di = users[id];
				lst += TM.replace('firesrow', {
					'id': id,
					'unm': buildUserName(di)
				});
			}
			this._TM.getEl('finduserpanel.result').innerHTML = this._TM.replace('firestable', {'rows': lst});
		},
		onClick: function(el){
			var TId = this._TId;
			var tp = TId['finduserpanel'];
			switch(el.id){
			case tp['bfind']:
				this.findUser();
				return true;
			case tp['bclose']: this.close(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			switch(prefix){
			case (TId['firesrow']['append']+'-'):
				if (L.isFunction(this.callback)){
					this.callback(this.users[numid]);
				}
				this.close();
				return true;
			}

			return false;
		},
		findUser: function(){
			var TM = this._TM;
			var v = function(n){ return TM.getEl('finduserpanel.'+n).value; };
			var d = {
				'do': 'finduser',
				'lastname': v('lastname'),
				'firstname': v('firstname'),
				'username': v('username')
			};
			var e = function(n){ return d[n].length < 1; };
			if (!((!e('lastname') && !e('firstname')) || !e('username'))){ 
				return;
			}
			var __self = this;
			
			this._TM.getEl('finduserpanel.result').innerHTML = this._TM.replace('firestable', {'rows': ''});
			TM.getEl('finduserpanel.bfind').style.display = 'none';
			TM.getEl('finduserpanel.wait').style.display = '';
			
			Brick.ajax('bopros', {
				'data': d,
				'event': function(request){
					TM.getEl('finduserpanel.bfind').style.display = '';
					TM.getEl('finduserpanel.wait').style.display = 'none';
					__self.renderUsers(request.data);
				}
			});

		}
	});
	NS.UserAppendPanel = UserAppendPanel;

	API.showUserAppendPanel = function(callback){
		new NS.UserAppendPanel(callback);
	};
	
	

};