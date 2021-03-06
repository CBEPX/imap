
	_zoom_meters = [1000000,500000,300000,100000,50000,20000,10000,5000,2000,1000,500,300,100,50,30,20,10,5,0];
	jQuery('#imapworkarea').show();
	jQuery('#imapworkareaError').hide();

	function escapeHtml(text) {
	  var map = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#039;'
	  };

	  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
	}
	
	function getLayers() {
	  
		var osm = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});
		var ocm = new L.tileLayer('http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png', {attribution: 'Maps &copy; <a href="http://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
		var oqm = new L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'});
		
		var mapsurf = new L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/roads/x={x}&y={y}&z={z}', {attribution: 'Map Data: © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors'});
		var mapsurft = new L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/hybrid/x={x}&y={y}&z={z}', {attribution: 'Map Data: © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors'});
		
		var mapboxsat = new L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg', {maxZoom:17, attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'});
		
		var stamenbw = new L.tileLayer('http://d.tile.stamen.com/toner/{z}/{x}/{y}.png', {attribution: 'Map Data: © <a href="http://maps.stamen.com/" target="_blank">Stamen.com</a>'});
		
		var kosmosnimki = new L.tileLayer('http://a.tile.osm.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png', {attribution: 'Map Data: © <a href="http://osm.kosmosnimki.ru/" target="_blank">osm.kosmosnimki.ru</a>'});
		
		var overlayMaps = {
		    "MapSurfer transparent": mapsurft
		};
		
		var baseMaps = {
		    "OpenStreetMap": osm,
		    "OpenCycleMap": ocm,
		    "MapQuest Open": oqm,
		    "Mapsurfer Roads": mapsurf,
		    "Mapbox satellite": mapboxsat,
		    "Stamen B&W": stamenbw,
		    "Kosmosnimki.ru": kosmosnimki
		};
		
		if (bingAPIkey) {
			baseMaps["Bing Satellite"] = new L.BingLayer(bingAPIkey);
			baseMaps["Bing Hybrid"] = new L.BingLayer(bingAPIkey, {type: 'AerialWithLabels'});
			baseMaps["Bing"] = new L.BingLayer(bingAPIkey, {type: 'Road'});
		};
		
		try {
			baseMaps["Yandex"] = new L.Yandex();
			baseMaps["Yandex Satellite"] = new L.Yandex('satellite');
			baseMaps["Yandex Hybrid"] = new L.Yandex('hybrid');
		} finally {};
		
		try {
			baseMaps["Google Satellite"] = new L.Google();
			baseMaps["Google"] = new L.Google('TERRAIN');
			baseMaps["Google Hybrid"] = new L.Google('HYBRID');
		} finally {};		
		
		return([baseMaps,overlayMaps]);
	}
	_imap.markers = new L.MarkerClusterGroup({
		maxClusterRadius: 30,
		iconCreateFunction: function (cluster) {
			var cmarkers = cluster.getAllChildMarkers();
			var chost = new Object;
			chost.ok = 0; chost.problem=0; chost.maintenance=0;
			var n = 0;
			var count = 0;
			for (var i = 0; i < cmarkers.length; i++) {
				n = Math.max(+cmarkers[i].options.status,n);
				count++;
				if (cmarkers[i].options.del) {
					count--;
				} else if ((cmarkers[i].options.nottrigger) & (cmarkers[i].options.maintenance)) {
					chost.maintenance++;
				} else if (cmarkers[i].options.status>0) {
					chost.problem++;
				} else {
					chost.ok++;
				};
			};
			return L.divIcon({className:'icon_status_cluster icon_status_'+n,html:'<span class=st_ok>'+chost.ok+'/</span><span class=st_problem>'+chost.problem+'/</span><span class=st_maintenance>'+chost.maintenance+'</span>',iconAnchor:[14, 14]});
		}
	});
	
	_imap.links = L.layerGroup();
	
	_imap.markersList = new Object;
	_imap.map = false;
	_imap.it_first = true;
	_imap.bbox = false;
	_imap.searchpopup;
	_imap.lines = new Object;
	_imap.hostsfilter = '';
	
	function linkOptions(hl) {
		var ttx='';
		ttx = ttx + '<div class="item"><button onClick="jQuery(\'.dellinkconfirm\').show();"><span class=delbutton>X</span> '+locale['Delete link']+'</button>  </div>';
		
		ttx = ttx + '<div style="display:none;" class="item dellinkconfirm"><button onClick="jQuery(\'.dellinkconfirm\').hide();">'+locale['Cancel']+'</button> <button style="display:none;" class=dellinkconfirm onClick="deleteLink('+hl+'); jQuery(\'#linkoptionsdialog\').dialog(\'destroy\');"><span class="delbutton">X</span> '+locale['Delete confirm']+'</button></div>';
		
		ttx = ttx + '<div class="item">'+locale['Link name']+'<br><input class=linkoption value="'+_imap.lines[hl][2].options.name+'" name=linkname type=text></div>';
		ttx = ttx + '<div class="item">'+locale['Link color']+'<br><input class=linkoption value="'+_imap.lines[hl][2].options.color+'" name=linkcolor type=color></div>';
		ttx = ttx + '<div class="item">'+locale['Link width']+', px<br><input class=linkoption value="'+_imap.lines[hl][2].options.weight+'" name=linkweight type=number min="1" max="20" step="1"></div>';
		ttx = ttx + '<div class="item">'+locale['Link opacity']+', %<br><input class=linkoption value="'+_imap.lines[hl][2].options.opacity*100+'" name=linkopacity type=number min="0" max="100" step="10"></div>';
		ttx = ttx + '<div class="item linkdash">'+locale['Link dash']+'<br><input class=linkoption value="'+_imap.lines[hl][2].options.dash+'" name=linkdash type=hidden><span onClick="jQuery(\'.item.linkdash ul\').slideToggle(\'fast\');"><svg height="8" width="100%"><g><path stroke="#2F2F2F" stroke-dasharray="'+_imap.lines[hl][2].options.dash+'" stroke-width="5" d="M5 0 l215 0"></path></g></svg></span><ul style="display:none;">';
		
		ttx = ttx + '<li><a href="#"><svg height="8" width="100%"><g><path stroke="#2F2F2F" stroke-dasharray="5,5" stroke-width="5" d="M5 0 l215 0"></path></g></svg></a></li>';
		ttx = ttx + '<li><a href="#"><svg height="8" width="100%"><g><path stroke="#2F2F2F" stroke-dasharray="2,5" stroke-width="5" d="M5 0 l215 0"></path></g></svg></a></li>';
		ttx = ttx + '<li><a href="#"><svg height="8" width="100%"><g><path stroke="#2F2F2F" stroke-dasharray="5,15,10" stroke-width="5" d="M5 0 l215 0"></path></g></svg></a></li>';
		ttx = ttx + '<li><a href="#"><svg height="8" width="100%"><g><path stroke="#2F2F2F" stroke-dasharray="2,15" stroke-width="5" d="M5 0 l215 0"></path></g></svg></a></li>';
		
		ttx = ttx + '</ul></div>';
		
		var scriptDialog = jQuery('<div>', {
				title:locale['Link options'],
				id: 'linkoptionsdialog',
				css: {
					display: 'none',
					'white-space': 'normal'
				}
		}).html(ttx);
		scriptDialog.dialog({
			title:locale['Link options'],
			resizable: true,
			height:380,
			modal: true,
			buttons: {
				Save: function() {
					var res = new Object;
					jQuery('#linkoptionsdialog .linkoption').each(function() {
						res[this.name] = this.value;
					});
					jQuery.ajax({
						url: 'imap.php',
						type: 'POST',
						dataType: 'json',
						data: {
							output: 'ajax',
							action_ajax: 'update_link',
							linkid: hl,
							linkoptions: res
						},
						success: function(data){
							if (data.error) {
								ajaxError(data.error.message);
								return;
							};
							loadLinks(hl);
							showMes(locale['Successful']);
						},
						error: function(data){
							ajaxError(locale['Failed to update data']);
						}
					});
					jQuery( this ).dialog( "destroy" );
				},
				Cancel: function() {
					jQuery( this ).dialog( "destroy" );
				}
			}
		});
		jQuery("input[type='color']").minicolors();
		jQuery("input[type='number']").css('width','80%');
		jQuery("input[type='number']").stepper();
		
	};
	
	function ajaxError(mmes,cr) {
		if (mmes == undefined) mmes = locale['Failed to update data'];
		showMes('<b><font color=red>'+locale['Error']+'</font></b>: '+mmes,cr);
	};
	
	function deleteLink(linkid) {
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				output: 'ajax',
				action_ajax: 'del_link',
				linkid: linkid
			},
			success: function(data){
				if (data.error) {
					ajaxError(data.error.message);
					return;
				};
				delLine(linkid);
				showMes(locale['Successful']);
			},
			error: function(data){
				ajaxError(locale['Failed to update data']);
			}
		});
	};
	
	function hostsFilter(hh,ff) {
		if (ff == undefined) return true;
		if (ff == '') return true;
		if (!_imap.markersList[hh].host_info) return true;
		var res = false;
		res = ((res) || (_imap.markersList[hh].host_info.name.toLowerCase().indexOf(ff.toLowerCase())>-1));
		res = ((res) || (_imap.markersList[hh].host_info.host.toLowerCase().indexOf(ff.toLowerCase())>-1));
		res = ((res) || (_imap.markersList[hh].host_info.description.toLowerCase().indexOf(ff.toLowerCase())>-1));
		res = ((res) || (_imap.markersList[hh].host_info.inventory.type.toLowerCase().indexOf(ff.toLowerCase())>-1));
		
		var ob = jQuery.makeArray( _imap.markersList[hh].host_info.interfaces );
		
		for(key in ob) {
			if (ob[key].ip) res = ((res) || (ob[key].ip.toLowerCase().indexOf(ff.toLowerCase())>-1));
		};
		return res;
	};
	
	var timeoutHostSearch1;

	function getHostsFilter1T(tx) {
		if (timeoutHostSearch1) clearTimeout(timeoutHostSearch1);
		timeoutHostSearch1=setTimeout(function(){ getHostsFilter1(tx) },1000);
	};

	function getHostsFilter1(tx) {
		_imap.hostsfilter = tx.toLowerCase();
		if (_imap.hostsfilter=='') {
		  jQuery('#filter-indicator').hide();
		} else {
		  jQuery('#filter-indicator').show();
		};
		for (nn in _imap.markersList) {
			if (hostsFilter(+nn,_imap.hostsfilter)) {
				showMarker(+nn);
				jQuery('.host_in_list').filter('[hostid='+nn+']').show();
			} else {
				unshowMarker(+nn);
				jQuery('.host_in_list').filter('[hostid='+nn+']').hide();
			};
		};
	};
	
	var timeoutHostSearch2;
	
	function getHostsFilter2T(tx) {
		if (timeoutHostSearch2) clearTimeout(timeoutHostSearch2);
		timeoutHostSearch2=setTimeout(function(){ getHostsFilter2(tx) },1000);
	};
	
	function getHostsFilter2() {
		var tx = jQuery('.links_filter input').val();
		if (tx==='') {
			jQuery('.links_fields table tr').show();
			return;
		};
		jQuery('.links_fields table tr').hide();
		jQuery('.links_fields table tr').filter(function(){ return( hostsFilter(jQuery(this).attr('hostid'),tx) ) }).show();
		
	};
	
	function updateLine(nn) {
		if (!_imap.settings.links_enabled) return;
		if ( (_imap.markersList[_imap.lines[nn][0]]) && (_imap.markersList[_imap.lines[nn][1]]) ) {
			if ( (_imap.markers.hasLayer(_imap.markersList[_imap.lines[nn][0]].marker)) && (_imap.markers.hasLayer(_imap.markersList[_imap.lines[nn][1]].marker)) ) {
				if ((_imap.markers.getVisibleParent(_imap.markersList[_imap.lines[nn][0]].marker)) || (_imap.markers.getVisibleParent(_imap.markersList[_imap.lines[nn][1]].marker))) {
					if (_imap.markers.getVisibleParent(_imap.markersList[_imap.lines[nn][0]].marker) != _imap.markers.getVisibleParent(_imap.markersList[_imap.lines[nn][1]].marker)) {
						_imap.lines[nn][2].spliceLatLngs(0, 2);
						_imap.lines[nn][2].addLatLng(_imap.markersList[_imap.lines[nn][0]].marker._latlng);
						_imap.lines[nn][2].addLatLng(_imap.markersList[_imap.lines[nn][1]].marker._latlng);
						
						if (_imap.markersList[_imap.lines[nn][0]].marker._latlng.distanceTo(_imap.markersList[_imap.lines[nn][1]].marker._latlng)>_zoom_meters[_imap.map.getZoom()]) {
							if (!_imap.links.hasLayer(_imap.lines[nn][2])) {
								_imap.links.addLayer(_imap.lines[nn][2]);
							};
							return;
						};
					};
				};
			};
		};
		_imap.links.removeLayer(_imap.lines[nn][2]);
	};
	
	function updateLines() {
		if (!_imap.settings.links_enabled) return;
		for (var nn in _imap.lines) {
			updateLine(+nn);
		};
	};
	
	function updateLinesMarker(mm) {
		if (!_imap.settings.links_enabled) return;
		for (var nn in _imap.lines) {
			if ( (mm == _imap.lines[+nn][0]) | (mm == _imap.lines[+nn][1]) ) {
				updateLine(+nn);
			};
		};
	};
	
	function loadLine(nl) {
		if (!_imap.settings.links_enabled) return;
		if (_imap.lines[nl.id]) {
			_imap.links.removeLayer(_imap.lines[nl.id][2]);
		};
		if ((nl.host1 == undefined)||(nl.host2 == undefined)||(nl.id == undefined)) return false;
		if (nl.dash == '0') nl.dash = '';
		if (nl.color == '0') nl.color = '#0034ff';
		if (nl.opacity == '0') nl.opacity = 50;
		nl.opacity = nl.opacity/100;
		if (nl.weight == '0') nl.weight = 2;
		_imap.lines[nl.id] = {0:nl.host1, 1:nl.host2, 2:L.polyline([], {color: nl.color, name:'', dashArray: nl.dash, opacity:nl.opacity, weight: nl.weight, smoothFactor:8})};
		if ((nl.name !== undefined) & (nl.name !== '0')) {
			_imap.lines[nl.id][2].bindLabel(escapeHtml(nl.name));
			_imap.lines[nl.id][2].options.name = escapeHtml(nl.name);
		};
		_imap.lines[nl.id][2].on('click',function(){linkOptions(nl.id);});
		updateLine(nl.id);
		return true;
	};
	
	function delLine(nn) {
		_imap.links.removeLayer(_imap.lines[nn][2]);
		delete _imap.lines[nn];
	};
	
	function getRandomLatLng(map) {
		var bounds = map.getBounds(),
			southWest = bounds.getSouthWest(),
			northEast = bounds.getNorthEast(),
			lngSpan = northEast.lng - southWest.lng,
			latSpan = northEast.lat - southWest.lat;

		return new L.LatLng(
			southWest.lat + latSpan * Math.random(),
			southWest.lng + lngSpan * Math.random()
		);
	};

	function showMes(tt,cr,id) {
		var el;
		el = jQuery('<div/>', {
			html: '<div>'+tt+'</div>'
		});
		if (id!==undefined) el.attr("id",id);
		if (cr===0) el.append('<div class=close onClick="jQuery(this).parent().remove();">X</div>');
		el.appendTo('#imapmes');
		if (cr==undefined) el.delay(2000).slideUp('fast',function(){$(this).remove();});
		if (cr>0) el.delay(cr).slideUp('fast');
	};
	
	function getHostLocation(hh) {
		_imap.map.off('click');
		var el;
		el = jQuery('<div/>');
		el.html(locale['Select a new position']+' <a style="color:red;" onClick="setHostLocation();" href="#">'+locale['Cancel']+'</a>').attr("id",'mesGetHostLocation').appendTo('#imapmes');
		jQuery(_imap.map._container).css('cursor','crosshair');
		_imap.map.on('click',function(e){ setHostLocation(hh,e.latlng.lat,e.latlng.lng); return false; });
	};
	
	function getHardware(hh,event) {
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				output: 'ajax',
				action_ajax: 'get_hardware'
			},
			success: function(data){
				if (data.result) {
					var hardwareDialog = jQuery('<ul>', {
						title:locale['Set a hardware type'],
						id: 'select-hardware-form',
						css: {
							display: 'none',
							'overflow-y': 'auto'
						}
					});
					
					hardwareDialog.html(hardwareDialog.html()+'<li onclick="setHardware('+hh+',\'\'); jQuery(\'#select-hardware-form\').dialog( \'destroy\' );" class="hardware-select"><img width="20px" src="imap/hardware/none.png"> none </li>');
					for (var nn=0; nn<data.result.length; nn++) {
						var tt1 = data.result[+nn].substring(0, data.result[+nn].length-4);
						var tt2 = data.result[+nn];
						hardwareDialog.html(hardwareDialog.html()+'<li onclick="setHardware('+hh+',\''+tt1+'\'); jQuery(\'#select-hardware-form\').dialog( \'destroy\' );" class="hardware-select"><img width="20px" src="imap/hardware/'+tt2+'"> '+tt1+' </li>');
					};
					
					hardwareDialog.dialog({
						title:locale['Set a hardware type'],
		
						resizable: true,
						height:450,
						modal: true,
						buttons: {
							Cancel: function() {
								jQuery( this ).dialog( "destroy" );
							}
						}
					});
					jQuery('#select-hardware-form .hardware-select').mouseover(function(){
						jQuery(this).addClass('active');
					  
					}).mouseout(function(){
					  jQuery(this).removeClass('active'); 
					  
					});
					
				};
			},
			error: function(data) {
				ajaxError(locale['Failed to update data']);
			}
		});
	};
	
	function setHardware(hh, im) {
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				action_ajax: 'set_hardware',
				output: 'ajax',
				hostid: hh,
				hardware: im
			},
			success: function(data){
				_imap.markersList[+hh].marker.options.hardware = im;
				updateMarker(+hh);
				_imap.map.closePopup();
				_imap.markersList[+hh].marker.openPopup();
			},
			error: function(data) {
				ajaxError(locale['Failed to update data']);
			}
		});
	};
	
	function setHostLocation(hh,lat,lng) {
		_imap.map.off('click');
		jQuery(_imap.map._container).css('cursor','');
		jQuery('#mesGetHostLocation').remove();
		if ((hh==undefined) || (lat==undefined) || (lng==undefined)) return;
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				action_ajax: 'update_coords',
				output: 'ajax',
				hostid: hh,
				lat: lat,
				lng: lng
			},
			success: function(data){
				if (data.result) {
					if (!_imap.markersList[hh]) {
						jQuery('.host_in_list').filter('[hostid='+hh+']').remove();
						loadHosts();
						return;						
					};
					_imap.markers.removeLayer(_imap.markersList[hh].marker);
					_imap.markersList[hh].marker.setLatLng([lat,lng]);
					_imap.markers.addLayer(_imap.markersList[hh].marker);
				} else {
					showMes(locale['Error']+': '+locale['Failed to update data']);
				};
			},
			error: function(data) {
				ajaxError(locale['Failed to update data']);
			}
		});
	};
	
	function reQdelHostLocation(hh) {
		var scriptDialog = jQuery('<div>', {
				title:locale['Execution confirmation'],
				css: {
					display: 'none',
					'white-space': 'normal'
				}
		}).html(locale['Delete location']+'?');
		scriptDialog.dialog({
			title:locale['Execution confirmation'],
			resizable: false,
			height:140,
			modal: true,
			buttons: {
				Ok: function() {
					delHostLocation(hh);
					jQuery( this ).dialog( "destroy" );
				},
				Cancel: function() {
					jQuery( this ).dialog( "destroy" );
				}
			}
		});
	};
	
	function getDebugInfo(tt,hh,tr) {
		var txt = '';
		if (tt=='host') {
			txt = dump(_imap.markersList[hh].host_info);
		} else if (tt=='trigger') {
			txt = dump(_imap.markersList[hh].triggers[tr]);
		} else {
			txt = 'No debug info.';
		};
		var scriptDialog = jQuery('<div>', {
				title:locale['Debug information'],
				css: {
					display: 'none',
					'white-space': 'normal'
				}
		}).html('<pre>'+txt+'</pre>');
		scriptDialog.dialog({
			title:locale['Debug information'],
			resizable: true,
			modal: false,
			buttons: {
				Close: function() {
					jQuery( this ).dialog( "destroy" );
				}
			}
		});
	};
	
	function sortingHosts(){
		var elements = jQuery('#hosts_list .host_in_list');
		var target = jQuery('#hosts_list');
		
		elements.sort(function (a, b) {
			var an = jQuery(a).attr('hostname'),
			bn = jQuery(b).attr('hostname');
		    
			if (an && bn) {
				return an.toUpperCase().localeCompare(bn.toUpperCase());
			}
			
			return 0;
		});
		
		elements.detach().appendTo(target);
	};
	
	function delHostLocation(hh) {
		if (hh==undefined) return;
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				action_ajax: 'update_coords',
				output: 'ajax',
				hostid: hh,
				lat: 'none',
				lng: 'none'
			},
			success: function(data){
				if (data.result) {
					_imap.map.closePopup();
					unshowMarker(hh);
					delete _imap.markersList[hh];
					jQuery('.host_in_list').filter('[hostid='+hh+']').remove();
					loadHosts();
					
				} else {
					showMes(locale['Error']+': '+locale['Failed to update data']);
				};
			},
			error: function(data) {
				ajaxError(locale['Failed to update data']);
			}
		});
	};
	
	function mapBbox() {
		if (_imap.settings.pause_map_control) return;
		if (_imap.bbox) {
			var ll1 = L.latLng(_imap.bbox.minlat, _imap.bbox.maxlon);
			var ll2 = L.latLng(_imap.bbox.maxlat, _imap.bbox.minlon);
			var bb = L.latLngBounds(ll1,ll2);
			_imap.map.fitBounds(bb);
		};
	};

	function updateIcon(e,first) {
		vMarker = e;
		while (vMarker) {
			vMarker = vMarker.__parent;
			if (vMarker) {
				vMarker._updateIcon();
				if (vMarker.__iconObj) vMarker.setIcon(vMarker.__iconObj);
			};
		}
	};

	function setCookie(name, value, options) {
		options = options || {};
		var expires = options.expires;
		if (typeof expires == "number" && expires) {
			var d = new Date();
			d.setTime(d.getTime() + expires*1000);
			expires = options.expires = d;
		}
		if (expires && expires.toUTCString) {
			options.expires = expires.toUTCString();
		}
		value = encodeURIComponent(value);
		var updatedCookie = name + "=" + value;
		for(var propName in options) {
			updatedCookie += "; " + propName;
			var propValue = options[propName];   
			if (propValue !== true) {
			  updatedCookie += "=" + propValue;
			}
		}
	    
	      document.cookie = updatedCookie;
	};
	
	function getCookie(name) {
	    cookie_name = name + "=";
	    cookie_length = document.cookie.length;
	    cookie_begin = 0;
	    while (cookie_begin < cookie_length)
	    {
		value_begin = cookie_begin + cookie_name.length;
		if (document.cookie.substring(cookie_begin, value_begin) == cookie_name)
		{
		    var value_end = document.cookie.indexOf (";", value_begin);
		    if (value_end == -1)
		    {
			value_end = cookie_length;
		    }
		    return unescape(document.cookie.substring(value_begin, value_end));
		}
		cookie_begin = document.cookie.indexOf(" ", cookie_begin) + 1;
		if (cookie_begin == 0)
		{
		    break;
		}
	    }
	    return;
	};
	
	function addBbox(lat,lon,bbox) {
		if (bbox) {
			bbox.maxlat = Math.max(bbox.maxlat,lat);
			bbox.minlat = Math.min(bbox.minlat,lat);
			bbox.maxlon = Math.max(bbox.maxlon,lon);
			bbox.minlon = Math.min(bbox.minlon,lon);
		} else {
			bbox = new Object;
			bbox.maxlat = lat;
			bbox.minlat = lat;
			bbox.maxlon = lon;
			bbox.minlon = lon;
		};
		return bbox;
	};

	function showMarker(nn) {
		if (_imap.markersList[+nn].marker.options.show) return;
		_imap.markers.addLayer(_imap.markersList[+nn].marker);
		_imap.markersList[+nn].marker.options.del = false;
		_imap.markersList[+nn].marker.options.show = true;
		updateIcon(_imap.markersList[+nn]);
		updateLinesMarker(nn);
	};
	
	function unshowMarker(nn) {
		if (!_imap.markersList[+nn].marker.options.show) return;
		_imap.markersList[+nn].marker.options.del = true;
		updateIcon(_imap.markersList[+nn]);
		_imap.markers.removeLayer(_imap.markersList[+nn].marker);
		_imap.markersList[+nn].marker.options.del = false;
		_imap.markersList[+nn].marker.options.show = false;
		updateLinesMarker(nn);
	};
	
	function dump(obj) {
		var out = "";
		if(obj && typeof(obj) == "object"){
			out += "Object { \n";
			for (var i in obj) {
				out += i + ' : ' + dump(obj[i]);
			};
			out += "} \n";
		} else {
			out = obj + " \n";
		}
		return (out);
	};
	
	function loadTriggers() {
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				show_severity: _imap.filter.show_severity,
				hostid: _imap.filter.hostid,
				groupid: _imap.filter.groupid,
				action_ajax: 'get_triggers',
				output: 'ajax'
			},
			success: function(data){
				for (var nn in _imap.markersList) {
					for (var mm in _imap.markersList[+nn].triggers) {
						_imap.markersList[+nn].triggers[+mm].del = true;
					};
				};

					for (var nn in data) {
						var trigger = data[+nn];
						if (!trigger) continue;
						if (!trigger.value==1) continue;
						if (!_imap.markersList[trigger.hostid]) continue;
						_imap.markersList[trigger.hostid].triggers[trigger.triggerid] = trigger;
					};
				
				for (var nn in _imap.markersList) {
					for (var mm in _imap.markersList[+nn].triggers) {
						if (_imap.markersList[+nn].triggers[+mm].del) {
							delete _imap.markersList[+nn].triggers[+mm];
						};
					};
				};
				for (var nn in _imap.markersList) {
					updateMarker(_imap.markersList[+nn].marker.options.host_id);
					if (_imap.settings.show_with_triggers_only) {
						if (_imap.markersList[+nn].marker.options.status>=_imap.settings.min_status) {
							if (hostsFilter(+nn)) showMarker(+nn);
						} else {
							unshowMarker(+nn);
						};
					};
					if (_imap.markersList[+nn].marker.options.show) updateIcon(_imap.markersList[+nn].marker);
					if (_imap.markersList[+nn].marker.options.status>=_imap.settings.min_status) {
						_imap.bbox = addBbox(_imap.markersList[+nn].marker._latlng.lat,_imap.markersList[+nn].marker._latlng.lng,_imap.bbox);
					};
				};
				if (_imap.settings.do_map_control | _imap.it_first) {
					mapBbox(_imap.bbox);
				};
				
				if (_imap.it_first) {
					jQuery('#mesLoading').slideUp('fast');
					_imap.it_first = false;
				};
			},
			error: function(data){
				ajaxError(locale['Failed to get data']);
			}
		});
	};
	
	function addLinkHost(hh) {
		if (!_imap.settings.links_enabled) return;
		var ttx = '<div style="overflow-y:auto; height:100%;">';
		ttx = ttx+'<table class="tableinfo" cellpadding="3" cellspacing="1"';
		ttx = ttx+'<tr class="header"></tr>';
		var hhs = jQuery('.host_in_list');
		for (var nn=0; nn<hhs.length; nn++) {
			if (+jQuery(hhs[nn]).attr('hostid')!==+hh) ttx = ttx+'<tr class='+((nn % 2 == 0)?'even_row':'odd_row')+' hostid="'+jQuery(hhs[nn]).attr('hostid')+'"><td><input class="input checkbox pointer host_for_link" type="checkbox" value="'+jQuery(hhs[nn]).attr('hostid')+'">'+jQuery(hhs[nn]).text()+'</td></tr>';
		};
		ttx = ttx+'</table>';
		ttx = ttx+'</div>';
		var scriptDialog = jQuery('<div>', {
				css: {
					display: 'none',
					'white-space': 'normal'
				}
		}).html('<div class=links_filter><input type="search" placeholder="'+locale['Search']+'" onInput="getHostsFilter2T();" style="width:100%"></div><div class=links_fields>'+ttx+'</div>');
		scriptDialog.dialog({
			title:locale['Select hosts for links'],
			resizable: true,
			height:400,
			width:550,
			modal: true,
			close: function(event, ui){ jQuery(this).dialog('destroy').remove() },
			buttons: {
				Save: function() {
					var thh = [];
					var hhs = jQuery('.host_for_link:checked');
					for (var nn=0; nn<hhs.length; nn++) {
						thh[thh.length] = hhs[nn].value;
					};
					if (thh.length>0) {
						jQuery.ajax({
							url: 'imap.php',
							type: 'POST',
							dataType: 'json',
							data: {
								hostid: hh,
								thostid: thh,
								action_ajax: 'add_links',
								output: 'ajax'
							},
							success: function(data){
								loadLinks();
							},
							error: function(data){
								ajaxError(locale['Failed to update data']);
							}
						});
					};
					jQuery( this ).dialog( "close" );
				},
				Cancel: function() {
					jQuery( this ).dialog( "close" );
				}
			}
		});	
	};


	
	function updateMarker(host_id) {
		var status=0;
		var maintenance_t = (_imap.markersList[host_id].marker.options.maintenance?'maintenance ':'');
		var nottrigger_t = (_imap.markersList[host_id].marker.options.nottrigger?'nottrigger ':'');
		var rstr = '';
		rstr = rstr + '<div>';
		var hh = '<span class="link_menu" data-menu-popup="{&quot;type&quot;:&quot;host&quot;,&quot;hostid&quot;:&quot;'+host_id+'&quot;,&quot;showGraphs&quot;:true,&quot;showScreens&quot;:true,&quot;showTriggers&quot;:true,&quot;hasGoTo&quot;:true}">'+escapeHtml(_imap.markersList[host_id].marker.options.host_name)+'</span>';
		
		rstr = rstr + '<div class=hostname>';
		var hardware = ((_imap.markersList[host_id].marker.options.hardware && _imap.settings.show_icons)?'<img onerror="this.src=\'imap/hardware/none.png\';" title="'+_imap.markersList[host_id].marker.options.hardware+'" src=\'imap/hardware/'+_imap.markersList[host_id].marker.options.hardware+'.png\' class=hardwareIcon>':'');
		rstr = rstr + hardware;
		rstr = rstr + ' '+hh+'</div>';
		rstr = rstr + '<div class=hostcontrol>';
		rstr = rstr + '<a onClick="getHostLocation('+host_id+')" href="#" Title="'+locale['Change location']+'"><img src="imap/images/target.png"></a>';
		rstr = rstr + '<a onClick="reQdelHostLocation('+host_id+');" href="#" Title="'+locale['Delete location']+'"><img src="imap/images/target-del.png"></a>';
		if (_imap.settings.links_enabled) rstr = rstr + '<a href="#" Title="'+locale['Add a link to another host']+'" onClick="addLinkHost('+host_id+');"><img src="imap/images/link.png"></a>';
		if (_imap.settings.show_icons) rstr = rstr + '<a onClick="getHardware('+host_id+')" href="#" Title="'+locale['Set a hardware type']+'"><img src="imap/images/hardware.png"></a>';
		if (_imap.settings.debug_enabled) rstr = rstr + '<a onClick="getDebugInfo(\'host\','+host_id+')" href="#" Title="'+locale['Show debug information']+'"><img src="imap/images/debug.png"></a>';
		rstr = rstr + '</div>';
		rstr = rstr + '<div class=hostdescription>'+escapeHtml(_imap.markersList[host_id].marker.options.description)+'</div>';
		rstr = rstr + '<div class=triggers>';
		if (!((_imap.markersList[host_id].marker.options.nottrigger) & (_imap.markersList[host_id].marker.options.maintenance))) {
			for (var nn in _imap.markersList[host_id].triggers) {
				var trigger = _imap.markersList[host_id].triggers[+nn];
				rstr = rstr + '<div id="trigger'+trigger.triggerid+'" class="trigger triggerst'+trigger.priority+'"><span class="link_menu" data-menu-popup="{&quot;type&quot;:&quot;trigger&quot;,&quot;triggerid&quot;:&quot;'+trigger.triggerid+'&quot;,&quot;showEvents&quot;:true}">'+escapeHtml(trigger.description)+'</span>';
				if (_imap.settings.debug_enabled) rstr = rstr + '<a onClick="getDebugInfo(\'trigger\','+host_id+','+trigger.triggerid+')" href="#" Title="'+locale['Show debug information']+'"><img src="imap/images/debug.png"></a>';
				rstr = rstr + '<div class=lastchange lastchange='+trigger.lastchange+'></div></div>';
				status = Math.max(status,(trigger.priority>=_imap.settings.min_status?trigger.priority:0));
			};
		};
		rstr = rstr + '</div>';
		rstr = rstr + '</div>';
		_imap.markersList[host_id].marker.options.status = status;
		if (!_imap.markersList[host_id].marker.label) {
			_imap.markersList[host_id].marker.bindLabel('', {noHide: false, direction: 'auto', offset:[15,-15], className: 'leafletlabel'})
		};
		_imap.markersList[host_id].marker.label.setContent(hardware+' '+escapeHtml(_imap.markersList[host_id].marker.options.host_name));
		_imap.markersList[host_id].marker.bindPopup(rstr);
		_imap.markersList[host_id].marker.setIcon(L.divIcon({className:nottrigger_t+maintenance_t+'icon_status icon_status_'+_imap.markersList[host_id].marker.options.status,html:'',iconAnchor:[8, 8]}));
	};
	
	function loadLinks(hl) {
		if (!_imap.settings.links_enabled) return;
		
		var zdata = { hostid: _imap.filter.hostid, groupid: _imap.filter.groupid, action_ajax: 'get_links', output: 'ajax'};
		
		if (hl!==undefined) {
			zdata = { action_ajax: 'get_link', output: 'ajax', linkid: hl};
		};
		
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: zdata,
			success: function(data){
				for (var nn in data) {
					var link = data[+nn];
					if (!link) continue;
					loadLine(link);
				};
			},
			error: function(data){
				ajaxError(locale['Failed to get data']);
			}	   
		});
	};

	function loadHosts() {
		jQuery.ajax({
			url: 'imap.php',
			type: 'POST',
			dataType: 'json',
			data: {
				hostid: _imap.filter.hostid,
				groupid: _imap.filter.groupid,
				action_ajax: 'get_hosts',
				output: 'ajax'
			},
			success: function(data){
			  
				if (data.error) {
					ajaxError(data.error.message,1);
					exit();
				};
			  
				for (var nn in _imap.markersList) {
					_imap.markersList[+nn].del = true;
				};
				for (var nn in data) {
					var host = data[+nn];
					if (!host) continue;
					var host_id = host.hostid;
					var host_name = host.name;
					if (!jQuery('div.host_in_list').is('[hostid="'+host_id+'"]')) {
						jQuery('#hosts_list').append('<div class="host_in_list" hostname="'+host_name+'" hostid="'+host_id+'">'+host_name+'</div>');
						if ((host.inventory.location_lat=='') || (host.inventory.location_lat=='')) {
							jQuery('div.host_in_list').filter('[hostid="'+host_id+'"]').prepend('<img Title="'+locale['This host does not have coordinates']+'" onClick="getHostLocation('+host_id+')" class="host_crosschair" src="imap/images/target.png"> ');
						};
					};
					if ((host.inventory.location_lat=='') || (host.inventory.location_lat=='')) {
						continue;
					};
					var host_lat = +(host.inventory.location_lat).replace(',', '.');
					var host_lon = +(host.inventory.location_lon).replace(',', '.');
					var hardware = host.inventory.type;
					
					var maintenance = (host.maintenance_status === '1' ? true:false);
					var maintenance_t = (maintenance?'maintenance ':'');
					var nottrigger = (host.maintenance_type === '1' ? true:false);
					var nottrigger_t = (nottrigger?'nottrigger ':'');
					var description = host.description;
					
					if (_imap.markersList[host_id]) {
						/*обновляем хост*/
						host_status = _imap.markersList[host_id].marker.options.status;
						_imap.markersList[host_id].marker.options.maintenance = maintenance;
						_imap.markersList[host_id].marker.options.nottrigger = nottrigger;
						_imap.markersList[host_id].marker.options.hardware = hardware;
						_imap.markersList[host_id].marker.options.description = description;
						_imap.markersList[host_id].del = false;
					} else {
						/*новый хост*/
						var host_status = 0;
						var host_marker = L.marker([host_lat,host_lon],{host_id:host_id, host_name:host_name, status:host_status, maintenance:maintenance, nottrigger:nottrigger})
						_imap.markersList[host_id] = {marker: host_marker, triggers: new Object, del:false, clust:false};
						_imap.markersList[host_id].marker.on('move',function(){ updateLinesMarker(this.options.host_id); });
						_imap.markersList[host_id].marker.options.hardware = hardware;
						_imap.markersList[host_id].marker.options.description = description;
						if (!_imap.settings.show_with_triggers_only) {
							updateMarker(host_id);
							if (hostsFilter(host_id)) showMarker(host_id);
						};
						
						
						/*for (var nn in _imap.markersList) {
							cLines++;
							loadLine({'id':cLines, 'host1':+nn, 'host2':host_id});
						};*/
					};
					_imap.markersList[host_id].host_info = host;

				};
				sortingHosts();
				jQuery('.host_in_list').click(function(){viewHostOnMap(+jQuery(this).attr('hostid'))});
				
				
				for (var nn in _imap.markersList) {
					if ((_imap.markersList[+nn].del == true)) {
						unshowMarker(nn);
						delete _imap.markersList[+nn];
					};
				};
				/*if (bbox) { mapBbox(bbox) }; 
				updateLines();*/
				loadLinks();
				loadTriggers();
				
			},
			error: function(data){
				ajaxError(locale['Failed to get data']);
			}
		});
	};

	function viewHostOnMap(hh) {
		if (_imap.markersList[hh])
			_imap.map.setView(_imap.markersList[hh].marker._latlng,_imap.map.getMaxZoom());
	};
	
	function searchGoogle() {
		jQuery.get(
		  "https://maps.googleapis.com/maps/api/geocode/json",
		  {
		    sensor: 'true',
		    language: 'ru',
		    region: 'ru',
		    bounds: ''+_imap.map.getBounds()._northEast.lat+','+_imap.map.getBounds()._northEast.lng+'|'+_imap.map.getBounds()._southWest.lat+','+_imap.map.getBounds()._southWest.lng,
		    address: jQuery('#search-control-text').val()
		  },
		  function(text) {
			if (text.status=='OK') {
				jQuery('#search-control-list').html('');
				for (i=0; i<text.results.length; i++)
					jQuery('#search-control-list').append('<div class="result"> <a class="link google" lat='+text.results[i].geometry.location.lat+' lon='+text.results[i].geometry.location.lng+'><span class=searchname>'+text.results[i].formatted_address+'</span></a></div>');
				jQuery('#search-control-list').show();
				jQuery('#search-control-list .link').bind('click',function(event){
				event.stopPropagation();
				_imap.map.setView([+jQuery(this).attr('lat'),+jQuery(this).attr('lon')],18,{animate:false,pan:{animate:false},zoom:{animate:false}});
				var searchpopup = L.popup();
				searchpopup.setLatLng([+jQuery(this).attr('lat'),+jQuery(this).attr('lon')]);
				searchpopup.setContent(jQuery(this).html());
				_imap.map.openPopup(searchpopup)
				/*_imap.map.setView([+jQuery(this).attr('lat'),+jQuery(this).attr('lon')],18);*/
				});
			};
		  }
		);
	};

	function getPosition() {
		navigator.geolocation.getCurrentPosition(showPosition); // Запрашиваем местоположение, и в случае успеха вызываем функцию showPosition
	};

	function showPosition(position) {
		_imap.map.setView([position.coords.latitude, position.coords.longitude], _imap.map.getMaxZoom());
	};
	
	function iniMap() {
		_imap.map = new L.Map('mapdiv',{ zoomControl:false, attributionControl:false }).setView([59.95, 30.29], 4);
		
		L.control.attribution({position:'bottomleft'}).addTo(_imap.map);
		L.control.scale({position:'bottomleft',metric:true}).addTo(_imap.map);
		L.control.measure({position:'bottomleft'}).addTo(_imap.map);
	
		var SearchControl = L.Control.extend({
			options: {
				position: 'topleft'
			},

			onAdd: function (map) {
				// create the control container with a particular class name
				var container = L.DomUtil.create('div', 'search-control');
				container.innerHTML = '<form onsubmit="searchGoogle();return false;"><img class="middle" src="imap/images/logo-google.png"> <input id=search-control-text placeholder="'+locale.Search+'" type=search></form><div id=search-control-list></div>';
				jQuery(container).mouseleave(function(){
					  jQuery('#search-control-list').animate({height: 'hide'}, 'fast');
					  _imap.map.scrollWheelZoom.enable();
				});
				jQuery(container).mouseenter(function(){
					  jQuery('#search-control-list').animate({height: 'show'}, 'fast');
					  _imap.map.scrollWheelZoom.disable();
				});
				jQuery(container).click(function(event){ event.stopPropagation(); });
				jQuery(container).dblclick(function(event){ event.stopPropagation(); });
				jQuery(container).mousemove(function(event){ event.stopPropagation(); });
				jQuery(container).scroll(function(event){ event.stopPropagation(); });
				
				return container;
			}
		});
		if (_imap.settings.use_search) {
			_imap.map.addControl(new SearchControl());
		};
	
		
		var MyLocationControl = L.Control.extend({
			options: {
				position: 'bottomright'
			},

			onAdd: function (map) {
				// create the control container with a particular class name
				var container = L.DomUtil.create('div', 'my-location-control leaflet-control-layers');
				container.innerHTML = '<a onClick="getPosition();" href="#" Title="My location"></a>';
				return container;
			}
		});
		
		_imap.map.addControl(new MyLocationControl());

		if (_imap.settings.use_zoom_slider) {
			_imap.map.addControl(new L.Control.Zoomslider({position:'bottomright'}));
		} else {
			L.control.zoom({position:'bottomright'}).addTo(_imap.map);
		};
		
		
		var _layers = getLayers();
		baseMaps = _layers[0];
		overlayMaps = _layers[1];
		
		var lays=''+getCookie('maplayer');
		var isBaseLayer=false;
		lays=lays.split('|');
		for (lay in lays) {
			if (typeof baseMaps[lays[+lay]] != "undefined") {
			  _imap.map.addLayer(baseMaps[lays[+lay]]);
			  isBaseLayer=true;
			};
			if (typeof overlayMaps[lays[+lay]] != "undefined") {
			  _imap.map.addLayer(overlayMaps[lays[+lay]]);
			};
		};
		
		if (!isBaseLayer) {
			for (var bsf in baseMaps) break;
			baseMaps[bsf].addTo(_imap.map);
		};
		
		overlayMaps[locale['Hosts']] = _imap.markers;
		_imap.map.addLayer(_imap.markers);
		
		if (_imap.settings.links_enabled) {
			overlayMaps[locale["Host's links"]] = _imap.links;
			_imap.map.addLayer(_imap.links);
		};
		
		mapControl = L.control.layers(baseMaps, overlayMaps).addTo(_imap.map);

		jQuery('.leaflet-control-layers-selector').bind('change',function(){saveLayersMap()});
		_imap.map.on('moveend',function(){ updateLines(); });
		_imap.map.on('zoomend',function(){ updateLines(); });
		_imap.map.on('layerremove',function(event){ 
			if (event.layer.options) {
				if (event.layer.options.host_id) {
					updateLinesMarker(event.layer.options.host_id);
				};
			};
		});
		
		_imap.map.on('layeradd',function(event){ 
			if (event.layer.options) {
				if (event.layer.options.host_id) {
					updateLinesMarker(event.layer.options.host_id);
				};
			};
		});
	};

	function saveLayersMap() {
		var text = '';
		jQuery('input:checked.leaflet-control-layers-selector').parent().each(function(i){text=text+jQuery(this).text().trim()+'|'});
		setCookie('maplayer', text, {expires: 36000000, path: '/'})
	};
	
	function mapSize() {
		nheight = jQuery(window).innerHeight() - jQuery('.page_footer').outerHeight(true) - jQuery('#mapdiv').offset().top - 2;
		jQuery('#mapdiv').height(nheight);
		_imap.map.invalidateSize();
		if (_imap.settings.do_map_control) mapBbox();
	};

	function fuptime(val) {
		var D=Math.floor(val / 3600 / 24);
		val = val - (D*3600*24);
		if (D>0) {
			D = D+'d ';
		} else {
			D='';
		};
		var H=Math.floor(val / 3600);
		var M=Math.floor(val / 60) - (Math.floor(val / 3600) * 60); if (M<10) M='0'+M;
		var S=Math.round(val % 60);
		var SS=''+S;
		if (S<10) SS='0'+SS;
		
		zt= D+H+':'+M+':'+SS;
		return zt;
	};
	
	function timeUpdate() {
		var ct = new Date().getTime() / 1000;
		jQuery('[lastchange]').each(function() {
			var val = ct- (+jQuery(this).attr('lastchange'));
			jQuery(this).html(fuptime(val));
		});
	};
	
	jQuery(document).ready(function() {
		iniMap();
		mapSize();
		setInterval(function() { timeUpdate(); },1000);
		loadHosts();
		intervalID = window.setInterval(function(){loadHosts();}, 30000);
		
		
	});

	jQuery(window).resize(function(){if (document.readyState=='complete') mapSize()});

	