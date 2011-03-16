/*
@version $Id: project.js 890 2011-02-03 10:40:36Z roosit $
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	yahoo: ['dom', 'dragdrop'],
	mod:[
		{name: 'sys', files: ['data.js', 'container.js']},
        {name: 'uprofile', files: ['viewer.js']},
        {name: 'bopros', files: ['roles.js', 'lib.js']}
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
	
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};
	
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
	
	// менеджер облаков пользователей (групп пользователей) на доске проектов
	var CloudsManager = function(){
		this.init();
	};
	CloudsManager.prototype = {
		init: function(){
		
			this.clouds = [];
			this.tables = new Brick.mod.sys.TablesManager(NS.data, ['board', 'boardusers', 'boardprojectusers'], {'owner': this});
		},
		destroy: function(){
			this.tables.destroy();
		},
		onDataLoadWait: function(tables){ },
		onDataLoadComplete: function(tables){
			this.tables = tables;
			this.build();
		},
		build: function(){
			var userColors = {}, inc = 0;
			// определить таблицу цветов для пользователей
			NS.data.get('boardusers').getRows().foreach(function(row){
				if (inc >= colors.length){ inc = 0; }
				var user = row.cell;
				userColors[user.id] = colors[inc++];
			});
			this.userColors = userColors;

			// сортировать
			var aprs = [];
			NS.data.get('board').getRows().foreach(function(row){
				aprs[aprs.length] = row;
			});
			
			var pGetNumSort = function(di){
				var n1 = di['pb'], n2 = di['cmtld'];
				return Math.max(L.isNull(n1)?0:n1*1, L.isNull(n2)?0:n2*1);
			};
			
			var naprs = aprs.sort(function(a, b){
				var n1 = pGetNumSort(a.cell), 
					n2 = pGetNumSort(b.cell);
				if (n1 > n2){ return -1;
				}else if(n1 < n2){ return 1; }
				return 0;
			});
			
			var gs = {};
			for (var prjIndex=0;prjIndex<naprs.length; prjIndex++){
				var row = naprs[prjIndex];
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
				if (!gs[key]){ gs[key] = {'count': 0, 'rows': [], 'sort': 0}; }
				var r = gs[key];
				r.count++;
				r.rows[r.rows.length] = row;
			};
			var ngs = [];
			for (var i in gs){
				gs[i]['key'] = i;
				ngs[ngs.length] = gs[i]; 
			}
			
			// подсчет среднестатестической велечины актуальности группы
			for (var i=0;i<ngs.length;i++){
				var g = ngs[i], count = g.count, sum = 0;
				
				for (var ii=0;ii<g.rows.length;ii++){
					var n = pGetNumSort(g.rows[ii].cell);
					if (n > 0){ sum += n; }else{ count--; }
				}
				if (count > 0){
					g.sort = sum/count;
				}
			}

			ngs = ngs.sort(function(a, b){
				if (a.sort > b.sort){ return -1;
				}else if(a.sort < b.sort){ return 1; }
				return 0;
			});
			this.clouds = ngs;
		},
		getClouds: function(rebuild){
			if (rebuild){
				this.clouds = null;
			}

			if (L.isNull(this.clouds)){
				this.build();
			}
			return this.clouds;
		},
		getCloudUserByProjectId: function(projectid){
			var ngs = this.clouds;
			for (var i=0;i<ngs.length;i++){
				var g = ngs[i];
				for (var ii=0;ii<g.rows.length;ii++){
					if (g.rows[ii].id == projectid){
						return g;
					}
				}
			}
			return null;
		}
	};
	NS.CloudsManager = CloudsManager;
	
	var _cmInstance = null;
	NS.CloudsManager.getInstance = function(){
		if (!L.isNull(_cmInstance)){ return _cmInstance; }
		_cmInstance = new CloudsManager();
		return _cmInstance;
	};
	
	var buildUserName = function(user){
		var emp = function(s){
			s = s || '';
			return s.length < 1;
		};
		return (emp(user['fnm']) && emp(user['lnm'])) ? user['unm'] : user['fnm'] + ' ' + user['lnm']; 
	};

	
	var UserListWidget = function(container, projectid){
		this.init(container, projectid);
	};
	UserListWidget.prototype = {
		init: function(container, projectid){
			this.projectid = projectid;
			
			this.cm = NS.CloudsManager.getInstance();
			
			buildTemplate(this, 'widget,table,rowwait,row');
			container.innerHTML = this._TM.replace('widget');
			
			this.tables = new Brick.mod.sys.TablesManager(NS.data, ['boardusers', 'boardprojectusers'], {'owner': this});
		},
		destroy: function(){
			this.tables.destroy();
		},
		onDataLoadWait: function(tables){ 
			var TM = this._TM, T = this._T;
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': T['rowwait']});
		},
		onDataLoadComplete: function(tables){
			var TM = this._TM, lst = "";;
			var cloud = this.cm.getCloudUserByProjectId(this.projectid);
			var ids = cloud.key.split(' ');
			
			for (var n in ids){
				// if (Brick.env.user.id != ids[n] || (Brick.env.user.id == ids[n] && ids.length == 1)){  
					var user = NS.data.get('boardusers').getRows().getById(ids[n]);
					if (!L.isNull(user)){
						var udi = user.cell;
						
						lst += TM.replace('row', {
							'unm': buildUserName(udi),
							'uid': udi['id'],
							'avatar': UP.avatar.get45(udi)
						})
					}
				// }
			}
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': lst});
		}
	};
	NS.UserListWidget = UserListWidget;

};