/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var BOSH_CONNECTING='http://192.168.0.6:5280/bosh';
var inLogin = document.getElementById("ok");
var outLogin = document.getElementById("salir");
var conn=null;

var MessageType = {
  MSG_TEXT  : 'msg_text',
  MSG_HTML  : 'msg_image'
};

var PubSub={

    conexion:null,

    show_raw: true,
    show_log: true,

  // log to console if available
    log: function (msg) { 
        if (PubSub.show_log && window.console) { console.log(msg); }
    },

  // show the raw XMPP information coming in
    raw_input: function (data){
        if (PubSub.show_raw) {
            PubSub.log('inputS/R: ' + data);
        }
  } ,

  // show the raw XMPP information going out
    raw_output: function (data) { 
        if (PubSub.show_raw) {
            PubSub.log('outputS/S: ' + data);
        }
    }
  
};
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        console.log('Received Device Ready Event');
        console.log('calling setup push');
        conn = new Strophe.Connection(BOSH_CONNECTING);
        PubSub.conexion = conn;
        PubSub.conexion.rawInput = PubSub.raw_input;
        PubSub.conexion.rawOutput = PubSub.raw_output;

        outLogin.addEventListener('click',function (){
            PubSub.conexion.disconnect();
            conn.disconnect();
            app.initialize();
        });
        
        inLogin.addEventListener('click', function (){



            var jid=  $("#jid").val().toLowerCase();
            var password= $('#password').val();
            var serviceC= $('#service').val().toLowerCase();
            var nodeC= $('#node').val();

            var pushJ = {

                NS_PUBSUB: "http://jabber.org/protocol/pubsub",
                NS_PUBSUB_ERRORS: "http://jabber.org/protocol/pubsub#errors",

                on_event: function (msg) {    
                    if ($(msg).attr('type') == 'headline'){//buscamos headline
                        //buscar data para extraer el pubsub
                        var _data = $(msg).children('event').children('items').children('item').children('entry').text();
                            if (_data) {
                                pushJ.handle_update(_data);
                            }
                        }
                    return true;
                },

                subscribed: function (iq) {
                /*
<iq to='pubsub.im.server.com' type='get' xmlns='jabber:client' id='7420:sendIQ'>
    <pubsub xmlns='http://jabber.org/protocol/pubsub'>
        <items node='pubsub.im.server.com'/>
    </pubsub>
</iq>
                */ 
                    PubSub.conexion.sendIQ($iq({to: 'pubsub.im.server.com', type: "get"})
                                        .c('pubsub', {xmlns: pushJ.NS_PUBSUB})
                                        .c('items', {node: 'pubsub.im.server.com'}));

                },

                subscribe_error: function (iq) {
                    pushJ.show_error("Subscripcio error " + 
                                          pushJ.make_error_from_iq(iq));
                },
                /*

                */// error escuchadores 
                make_error_from_iq: function (iq) {
                    var error = $(iq)//BUSCAR iq
                        .find('*[xmlns="' + Strophe.NS.STANZAS + '"]')//xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'
                        .get(0).tagName;
                    var pubsub_error = $(iq)
                        .find('*[xmlns="' + pushJ.NS_PUBSUB_ERRORS + '"]');//xmlns de error enviado por el servidor
                    if (pubsub_error.length > 0) {
                        error = error + "/" + pubsub_error.get(0).tagName;
                    }

                    return error;
                },

                show_error: function (msg) {
                    PubSub.conexion.disconnect();
                    PubSub.conexion = null;
                    pushJ.service = null;
                    pushJ.node = null;
                    $('#error p').text(msg);
                },

                // decidimos que hacemos con la meta data encontrada
                handle_update: function (data) {
                    var _d = $(data);
                    var _message = _d.html();
                    var _type = _d.attr('type'); 
                    switch (_type) {
                    case MessageType.MSG_TEXT:
                        pushJ.show_text(_message);
                    break;
                    case MessageType.MSG_HTML:
                        pushJ.show_html(_message);
                    break;
                    default:
                        PubSub.log("tipo de mensaje incorrecto");
                    }
                },

                // inject text
                show_text: function (m) {
                    alert(m);
                    //$('#message').append(m);
                },

                // inject html
                show_html: function (m) {
                    var e = document.createElement('div');
                    e.innerHTML = m;
                    $('#message').html(e.childNodes[0].nodeValue);
                },

                on_roster: function (iq) {
                    PubSub.conexion.send($pres());
                },

                on_message: function (message) {
                    var jid_from = $(message).attr('from');
                    var jid = Strophe.getBareJidFromJid(jid_from);
                    var composing = $(message).find('composing');
                    var body = $(message).find("html > body");
                    if (body.length === 0) {
                        body = $(message).find('body');
                        if (body.length > 0) {
                            body = body.text();
                        } else {body = null;}
                    } else {
                        body = body.contents();
                        var span = $("<span></span>");
                        body.each(function () {
                            if (document.importNode) {
                                $(document.importNode(this, true)).appendTo(span);
                            } else {span.append(this.xml);}
                        });
                        body = span;
                    }

                    if (body) {$('#message').append('<br>'+ body);}
                    return true;
            }
        };

            
            conn.connect(jid,password, function onStatus(status,data,msg,m,action){
                if(status == Strophe.Status.DISCONNECTED){
                    PubSub.log('Desconectado');
                } else if(status == Strophe.Status.CONNECTING){
                    PubSub.log('conectando...');
                } else if( status == Strophe.Status.CONNFAIL){
                    PubSub.log('Conexion Fallida!');
                }else if(status == Strophe.Status.CONNECTED){
                    PubSub.log('conectado');
                    
                    /*
<presence xmlns='jabber:client'>
    <priority>-1</priority>
</presence>                    
                    */// Enviamos preseencia, y negativa por que no es un chat
                    PubSub.conexion.send($pres().c("priority").t("-1"));                
                    /*
<iq to='pubsub.im.server.com' type='set' xmlns='jabber:client' id='7183:sendIQ'>
    <pubsub xmlns='http://jabber.org/protocol/pubsub'>
        <subscribe node='pubsub.im.server.com' jid='user1@im.server.com/125093964079525675705234'/>
    </pubsub>
</iq>
                   */
                   var subiq = $iq({to: 'pubsub.im.server.com', type: "set"})
                                .c('pubsub', {xmlns: pushJ.NS_PUBSUB})
                                .c('subscribe', {node: 'pubsub.im.server.com', jid: PubSub.conexion.jid});
                    // Enviamos iq para solicitar pubsub, subcripcion y algun posible error de subcripcion.
                    PubSub.conexion.sendIQ(subiq, pushJ.subscribed, pushJ.subscribe_error);
                    PubSub.conexion.addHandler(pushJ.on_event,null, "message", null, null, 'pubsub.im.server.com');
                    
                    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
                    PubSub.conexion.sendIQ(iq, pushJ.on_roster);
                    PubSub.conexion.addHandler(pushJ.on_message, null, "message", "chat");             
                }});
            }, false);   
        app.setupPush();
    },
    
    setupPush: function() {
        console.log('calling push init');
        var push = PushNotification.init({
            "android": {
                "senderID": "XXXXXXXX"
            },
            "browser": {},
            "ios": {
                "sound": true,
                "vibration": true,
                "badge": true
            },
            "windows": {}
        });
        console.log('after init');

        push.on('registration', function(data) {
            console.log('registration event: ' + data.registrationId);

            var oldRegId = localStorage.getItem('registrationId');
            if (oldRegId !== data.registrationId) {
                // Save new registration ID
                localStorage.setItem('registrationId', data.registrationId);
                // Post registrationId to your app server as the value has changed
            }

            var parentElement = document.getElementById('registration');
            var listeningElement = parentElement.querySelector('.waiting');
            var receivedElement = parentElement.querySelector('.received');

            listeningElement.setAttribute('style', 'display:none;');
            receivedElement.setAttribute('style', 'display:block;');
        });

        push.on('error', function(e) {
            console.log("push error = " + e.message);
        });

        push.on('notification', function(data) {
            console.log('notification event');
            navigator.notification.alert(
                data.message,         // message
                null,                 // callback
                data.title,           // title
                'Ok'                  // buttonName
            );
       });
    }
};



 /*document.addEventListener("deviceready", onDeviceReady, false);

    // PhoneGap is loaded and it is now safe to make calls PhoneGap methods
    //
    function onDeviceReady() {
        // Now safe to use the PhoneGap API

        try
     {
        navigator.notification.alert('hola', ok, 'Title', 'Button!');  
     }
     catch(e)
     {
        alert("doesn't support!!", ok, 'Title', 'Button!');
     }
    }*/



