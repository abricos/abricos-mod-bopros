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
	

	var colors = 
		[
		 {'title': '41, 82, 163', 'body': '102, 140, 217'},
		 {'title': '163, 41, 41', 'body': '217, 102, 102'},
		 {'title': '40, 117, 78', 'body': '101, 173, 137'},
		 {'title': '134, 90, 90', 'body': '190, 148, 148'},
		 {'title': '177, 54, 95', 'body': '230, 115, 153'},
		 {'title': '13, 120, 19', 'body': '76, 176, 82'},
		 {'title': '112, 87, 112', 'body': '169, 146, 169'},
		 {'title': '122, 54, 122', 'body': '179, 115, 179'},
		 {'title': '82, 136, 0', 'body': '140, 191, 64'},
		 {'title': '78, 93, 108', 'body': '140, 102, 217'},
		 {'title': '82, 41, 163', 'body': '102, 140, 217'},
		 {'title': '41, 82, 163', 'body': '102, 140, 217'}
		 ];
	
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
			
			E.on(container, 'mouseover', this.onMouseOver, this, true);
			E.on(container, 'mouseout', this.onMouseOut, this, true);
			
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
			
			this.onRender = new YAHOO.util.CustomEvent("onRender");
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
			
			var userColors = {}, inc = 0;
			// определить таблицу цветов для пользователей
			NS.data.get('boardusers').getRows().foreach(function(row){
				if (inc >= colors.length){ inc = 0; }
				var user = row.cell;
				userColors[user.id] = colors[inc++];
			});
			this.userColors = userColors;
			
			var gs = {};
			NS.data.get('board').getRows().foreach(function(row){
				var di = row.cell, g = [di['uid']], chk = {};
				chk[di['uid']]=true;
				NS.data.get('boardprojectusers').getRows().filter({'pid': di['id']}).foreach(function(rrow){
					var ruid = rrow.cell['uid']*1;
					if (!chk[ruid]){
						g[g.length] = ruid;
						chk[ruid] = true;
					}
				});
				var key = g.sort().join(' ');
				if (!gs[key]){ gs[key] = {'count': 0, 'rows': {}}; }
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
				if (a.count > b.count){ return -1;
				}else if(a.count < b.count){ return 1; }
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
								// 'clrtitle': userColors[user.id].title,
								// 'clrbody': userColors[user.id].body,
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
						myproject = di['uid'] == Brick.env.user.id,
						isnew = L.isNull(di['cn']) && !myproject;
					
					var udi = NS.data.get('boardusers').getRows().getById(di['uid']).cell;
					
					
					ulst += TM.replace('urow', {
						'id': di['id'],
						'uid': di['uid'],
						'unm': buildUserName(udi),
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
			this.onRender.fire();
		},
		onMouseOver: function(e){
			return this.onMouse(E.getTarget(e), true);
		},
		onMouseOut: function(e){
			return this.onMouse(E.getTarget(e), false);
		},
		onMouse: function(el, on){

			var TId = this._TId,
				tp = TId['urow'];

			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case (tp['view']+'-'): this.mouseMoveProjectRow(numid, on); return true;
			}
			
			var elRowId = tp['id']+'row', isRowStep = 0;
			var isRow = function(fel){
				if (isRowStep++ > 5 || fel.id == TId['widget']['id'] ){ return null; }
				if (fel.tagName == 'TR' && Dom.hasClass(fel, elRowId)){
					return fel;
				}
				return isRow(fel.parentNode);
			};
			var fel = isRow(el); 
			if (!L.isNull(fel)){
				var prefix = fel.id.replace(/([0-9]+$)/, ''),
					numid = fel.id.replace(prefix, "");
				this.mouseMoveProjectRow(numid, on); return true;
			}
			
			return false;
		},
		mouseMoveProjectRow: function(prjid, on){
			var tp = this._TId['urow'],
				el = Dom.get(tp['id']+'-'+prjid);
			if (on){
				Dom.addClass(el, 'selected');
			}else{
				Dom.removeClass(el, 'selected');
			}

			// выделить автора проекта

			var prjRow = NS.data.get('board').getRows().getById(prjid);
			if (L.isNull(prjRow)){ return; }
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
			
			var c1 = 'group-row-hshow', c2 = 'group-row-hhide';
			if (isshow){ var c = c1; c1 = c2; c2 = c; }
			Dom.replaceClass(Dom.get(tp['ghead']+'-'+gid), c1, c2);
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
			// this.boardWidget.onRender.subscribe(this.onBoardWidgetRender, this, true);
			NS.data.request();
		},
		onBoardWidgetRender: function(){
		},
		onClick: function(el){
			if (this.boardWidget.onClick(el)){ return true; }
			return false;
		},
		destroy: function(){
			// this.boardWidget.onRender.unsubscribe(this.onBoardWidgetRender);
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