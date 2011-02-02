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
        {name: 'bopros', files: ['project.js']}
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
	
	Brick.util.CSS.update(Brick.util.CSS['bopros']['board']);
	
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
	
	var BoardWidget = function(container){
		this.init(container);
	};
	BoardWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'widget,table,row,rowwait,grow,urow,empty');
			container.innerHTML = this._TM.replace('widget');
			
			this.groupids = [];
			
			this.tables = new Brick.mod.sys.TablesManager(NS.data, 
					[
					 'board', 
					 'boardusers', 
					 'boardprojectusers'
					], {'owner': this});

			if (!R.isWrite){
				this._TM.getEl('widget.bappend').style.display = 'none';
			}
		},
		destroy: function(){
			this.tables.destroy();
		},
		onDataLoadWait: function(tables){ 
			var TM = this._TM, T = this._T;
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': T['rowwait']});
		},
		onDataLoadComplete: function(tables){
			this.render(); 
		},
		render: function(){
			var TM = this._TM;
			if (NS.data.get('board').getRows().count() < 1){
				TM.getEl('widget.table').innerHTML = TM.replace('empty');
				return;
			}
			
			var gs = {};
			NS.data.get('board').getRows().foreach(function(row){
				var di = row.cell, g = [di['uid']];
				NS.data.get('boardprojectusers').getRows().filter({'pid': di['id']}).foreach(function(rrow){
					g[g.length] = rrow.cell['uid'];
				});
				var key = g.sort().join(' ');
				if (!gs[key]){
					gs[key] = {'count': 0, 'rows': {}};
				}
				var r = gs[key];
				r.count++;
				r.rows[di['id']] = row;
			});
			var ngs = [];
			for (var i in gs){
				gs[i]['key'] = i;
				ngs[ngs.length] = gs[i]; 
			}
			var ngs = ngs.sort(function(a, b){
				if (a.count > b.count){
					return -1;
				}else if(a.count < b.count){
					return 1;
				}
				return 0;
			});
			this.groupids = ngs;
			var lst = "";
			for (var i=0;i<ngs.length;i++){
				var g = ngs[i], glst = "", ulst = "";
				
				var gusersnm = [];
				// список пользователей в группе
				var ids = g.key.split(' ');
				for (var n in ids){
					if (Brick.env.user.id != ids[n] || (Brick.env.user.id == ids[n] && ids.length == 1)){  
						var user = NS.data.get('boardusers').getRows().getById(ids[n]);
						if (!L.isNull(user)){
							var udi = user.cell;
							
							
							gusersnm[gusersnm.length] = buildUserName(udi);
							glst += TM.replace('grow', {
								'unm': buildUserName(udi),
								'uid': udi['id'],
								'avatar': UP.avatar.get45(udi)
							})
						}
					}
				}
				
				for (var ii in g.rows){
					var row = g.rows[ii];
					var di = row.cell,
						isnewcmt = !L.isNull(di['cmtn']) && di['cmtn'],
						isnew = L.isNull(di['cn']),
						myproject = di['uid'] == Brick.env.user.id;
					
					ulst += TM.replace('urow', {
						'id': di['id'],
						'uid': di['uid'],
						'ispublish': (myproject && di['pb'] == 0 ? '' : 'none'),
						'isedit': myproject ? '' : 'none',
						'pb': Brick.dateExt.convert(di['pb']),
						'cmt': di['cmt'],
						'iscmtnew': (isnewcmt ? '' : 'none'),
						'cmtn': (isnewcmt ? di['cmtn'] : '0'),
						'isnew': (isnew ? '' : 'none'),
						'isremove': myproject ? '' : 'none',
						'tl': di['tl']
					});
				}
				
				lst += TM.replace('row', {
					'gid': i,
					'gusers': gusersnm.join(', '),
					'gucnt': gusersnm.length,
					'gkey': g.key.split(' ').join(''),
					'group': glst,
					'projects': ulst
				});
			}
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': lst});
		},
		onResize: function(rel){
			var el = this._TM.getEl('widget.container');
			el.style.height = (rel.height - 70)+'px';
		},
		refresh: function(){
			NS.data.get('board').clear();
			NS.data.request();
		},
		help: function(){			
			Brick.f("bopros", "help", "showHelpPanel");
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['widget'];
			switch(el.id){
			case TId['empty']['bappend']: 
			case tp['bappend']: 
				API.showProjectEditorPanel(0);
				return true;
			case tp['brefresh']: this.refresh(); return true;
			case tp['help']: this.help(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
			
			tp = TId['urow'];
			switch(prefix){
			case (tp['publish']+'-'):
				this.projectPublish(numid);
				return true;
			case (tp['edit']+'-'):
			case (tp['editimg']+'-'):
				API.showProjectEditorPanel(numid);
				return true;
			case (tp['remove']+'-'):
			case (tp['removeimg']+'-'):
				this.projectRemove(numid);
				return true;
			case (tp['view']+'-'):
				this.projectShow(numid);
				return true;
			}

			tp = TId['row'];
			switch(prefix){
			case (tp['ghide']+'-'): this.showHideGroup(false, numid); return true;
			case (tp['gshow']+'-'): this.showHideGroup(true, numid); return true;
			case (tp['newproject']+'-'):
				API.showProjectEditorPanel(0, this.groupids[numid].key);
				return true;
			}

			return false;
		},
		showHideGroup: function(isshow, gid){
			var tp = this._TId['row'];
			Dom.get(tp['grow']+'-'+gid).style.display = isshow ? '' : 'none';
			Dom.get(tp['ghide']+'-'+gid).style.display = isshow ? '' : 'none';
			Dom.get(tp['gshow']+'-'+gid).style.display = !isshow ? '' : 'none';
		},
		projectShow: function(projectid){
			var __self = this;
			API.showProjectPanel(projectid, {
				'onLoadComments': function(){
					__self.refresh();
				}
			});
		},
		projectPublish: function(projectid){
			var __self = this;
			Brick.ajax('bopros', {
				'data': {
					'do': 'projectpublish',
					'projectid': projectid
				},
				'event': function(request){
					var project = request.data;
					if (!L.isNull(project)){ 
						NS.CACHE.project[project.id] = project;
					}
					__self.refresh();
				}
			});
		},
		projectRemove: function(projectid){
			var row = NS.data.get('board').getRows().getById(projectid);
			if (L.isNull(row)){ return; }
			var __self = this;
			new ProjectRemovePanel(row.cell['tl'], function(){
				Brick.ajax('bopros', {
					'data': {
						'do': 'projectremove',
						'projectid': projectid
					},
					'event': function(request){
						__self.refresh();
					}
				});				
			});
		}
	};
	NS.BoardWidget = BoardWidget;

	var BoardPanel = function(frend){
		this.frend = frend;
		BoardPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
			//,state: Brick.widget.Panel.STATE_MAXIMIZED
		});
	};
	YAHOO.extend(BoardPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			this.boardWidget = new BoardWidget(this._TM.getEl('panel.widget'));
			NS.data.request();
		},
		onClick: function(el){
			if (this.boardWidget.onClick(el)){ return true; }
			return false;
		},
		destroy: function(){
			this.boardWidget.destroy();
			BoardPanel.superclass.destroy.call(this);
		},
		onResize: function(){
			this.boardWidget.onResize(Dom.getRegion(this.body));
		}
	});
	NS.BoardPanel = BoardPanel;
	
	API.showBoardPanel = function(){
		R.load(function(){
			new BoardPanel();
		});
	};

	API.runApplication = function(){
		API.showBoardPanel();
	};
	
	var ProjectRemovePanel = function(prjTitle, callback){
		this.prjTitle = prjTitle;
		this.callback = callback;
		ProjectRemovePanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '500px',
			modal: true
		});
	};
	YAHOO.extend(ProjectRemovePanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjremovepanel');
			return this._TM.replace('prjremovepanel', {
				'tl': this.prjTitle
			});
		},
		onClick: function(el){
			var tp = this._TId['prjremovepanel'];
			switch(el.id){
			case tp['bremove']: this.callback(); this.close(); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		}
	});
	NS.ProjectRemovePanel = ProjectRemovePanel;

};