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
			
			var el = this._TM.getEl('finduserpanel.findact'),
				__self = this;
			E.on(el, 'keypress', function(e){
				if (__self.onKeyPress(E.getTarget(e), e)){ E.stopEvent(e); }
			});
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
		onKeyPress: function(el, e){
			if (e.keyCode != 13){ return false; }

			this.findUser();
			return true;
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
			if (!(!e('lastname') || !e('firstname') || !e('username'))){ 
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