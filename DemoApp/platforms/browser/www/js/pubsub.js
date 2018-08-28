var BOSH_CONNECTING='http://192.168.0.6:5280/bosh';
var MessageType = {
  MSG_TEXT  : 'msg_text',
  MSG_HTML  : 'msg_image'
};

var PubSub = {
    // xmpp estados
    pubsub_server: 'pubsub.im.server.com',
    connection: null,
    service: null,
    node: null,

    NS_DATA_FORMS: "jabber:x:data",
    NS_PUBSUB: "http://jabber.org/protocol/pubsub",
    NS_PUBSUB_OWNER: "http://jabber.org/protocol/pubsub#owner",
    NS_PUBSUB_ERRORS: "http://jabber.org/protocol/pubsub#errors",
    NS_PUBSUB_NODE_CONFIG: "http://jabber.org/protocol/pubsub#node_config",

    // pubsub event handler
    on_event: function (msg) {
        
        if ($(msg).attr('type') == 'headline'){//'headline'
            var _data = $(msg).children('event').children('items').children('item').children('entry').text();
        //alert("_data "+_data);
                
                if (_data) {
                    PubSub.handle_update(_data);
                }
            }
        return true;
    },


    // subscripcion callbacks
    subscribed: function (iq) {
        $(document).trigger("reception_started");
    },

    subscribe_error: function (iq) {
        PubSub.show_error("Subscripcio error " + 
                              PubSub.make_error_from_iq(iq));
    },

    // error escuchadores helpers
    make_error_from_iq: function (iq) {
        var error = $(iq)
            .find('*[xmlns="' + Strophe.NS.STANZAS + '"]')
            .get(0).tagName;
        var pubsub_error = $(iq)
            .find('*[xmlns="' + PubSub.NS_PUBSUB_ERRORS + '"]');
        if (pubsub_error.length > 0) {
            error = error + "/" + pubsub_error.get(0).tagName;
        }

        return error;
    },

    show_error: function (msg) {
        PubSub.connection.disconnect();
        PubSub.connection = null;
        PubSub.service = null;
        PubSub.node = null;

        $('#error p').text(msg);
    },

    // node creation callbacks
    created: function (iq) {
        // buscamos pubsub node
        var node = $(iq).find("create").attr('node');
        PubSub.node = node;
        // configuramos the node
        var configiq = $iq({to: PubSub.service,type: "set"})
            .c('pubsub', {xmlns: PubSub.NS_PUBSUB_OWNER})
            .c('configure', {node: node})
            .c('x', {xmlns: PubSub.NS_DATA_FORMS, type: "submit"})
            .c('field', {"var": "FORM_TYPE", type: "hidden"})
            .c('value').t(PubSub.NS_PUBSUB_NODE_CONFIG).up().up()
            .c('field', {"var": "pubsub#deliver_payloads"})
            .c('value').t("1").up().up()
            .c('field', {"var": "pubsub#send_last_published_item"})
            .c('value').t("never").up().up()
            .c('field', {"var": "pubsub#persist_items"})
            .c('value').t("true").up().up()
            .c('field', {"var": "pubsub#max_items"})
            .c('value').t("20");

        PubSub.connection.sendIQ(configiq, PubSub.configured, PubSub.configure_error);
    },

    create_error: function (iq) {
        PubSub.show_error("No se pudo crear pubsub-node " +
                              PubSub.make_error_from_iq(iq));
    },

    configured: function (iq) {
        $('#error').append('Broadcasting at service: ' + 
                      PubSub.service + 'node: ' +
                      PubSub.node);
    },

    configure_error: function (iq) {
        PubSub.show_error("NO se pudo configurar el pubsub-nodo " +
                              PubSub.make_error_from_iq(iq));
    },

    publish_action: function (action) {
        PubSub.connection.sendIQ(
            $iq({to: PubSub.service, type: "set"})
                .c('pubsub', {xmlns: PubSub.NS_PUBSUB})
                .c('publish', {node: PubSub.node})
                .c('item')
                .c('x', {xmlns: PubSub.NS_DATA_FORMS, type: "result"}));
                
    },

    // decide what to do with an incoming message
  handle_update: function (data) {
    var _d = $(data);
    var _message = _d.html();
    var _type = _d.attr('type'); 
    //alert(_message);
    switch (_type) {
      case MessageType.MSG_TEXT:
        PubSub.show_text(_message);
        break;
      case MessageType.MSG_HTML:
        PubSub.show_html(_message);
        break;
      default:
        PubSub.log("tipo de mensaje incorrecto");
    }
  },

  // inject text
  show_text: function (m) {
    //$('#message').text(m);
    $('#message').append(m);

  },

  // inject html
  show_html: function (m) {
    //alert(m);
    var e = document.createElement('div');
    e.innerHTML = m;
    $('#message').html(e.childNodes[0].nodeValue);
  },


    disconnect: function () {
        
            PubSub.connection.disconnect();
            PubSub.connection = null;
            PubSub.service = null;
            PubSub.node = null;
        
    },

    show_raw: true,
    show_log: true,

  // log to console if available
    log: function (msg) { 
        if (PubSub.show_log && window.console) { console.log(msg); }
    },

  // show the raw XMPP information coming in
    raw_input: function (data){
        if (PubSub.show_raw) {
            PubSub.log('RECV: ' + data);
        }
  } ,

  // show the raw XMPP information going out
    raw_output: function (data) { 
        if (PubSub.show_raw) {
            PubSub.log('SENT: ' + data);
        }
    }
  
};

 document.addEventListener("deviceready", onDeviceReady, false);

    // PhoneGap is loaded and it is now safe to make calls PhoneGap methods
    //
    function onDeviceReady() {
        // Now safe to use the PhoneGap API
        var conn = new Strophe.Connection(BOSH_CONNECTING);

    PubSub.connection = conn;
    PubSub.connection.rawInput = PubSub.raw_input;
    PubSub.connection.rawOutput = PubSub.raw_output;
       
    }

var ok = document.getElementById("ok");
ok.addEventListener("click", loginIn, false);

function loginIn() {
 jid:  $("#jid").val().toLowerCase(),
 password: $('#password').val(),
 service: $('#service').val().toLowerCase(),
 node: $('#node').val(),

    conn.connect(jid, password, function (status) {
        if (status == Strophe.Status.CONNECTING) {
            PubSub.log('Conectando...');
        }else if (status === Strophe.Status.CONNECTED) {
            PubSub.log('User Conectado...');
            // send negative presence send we’re not a chat client
            PubSub.connection.send($pres().c("priority").t("-1"));

            if (PubSub.node.length > 0) {
                // a node was specified, so we attempt to subscribe to it
                // first, set up a callback for the events
                PubSub.connection.addHandler(PubSub.on_event,null, "message", null, null, PubSub.service);

                // now subscribe
                var subiq = $iq({to: PubSub.service, type: "set"})
                .c('pubsub', {xmlns: PubSub.NS_PUBSUB})
                .c('subscribe', {node: PubSub.node, jid: PubSub.connection.jid});
                PubSub.connection.sendIQ(subiq, PubSub.subscribed, PubSub.subscribe_error);
            } else {
                // a node was not specified, so we start a new sketchcast
                var createiq = $iq({to: PubSub.service, type: "set"})
                .c('pubsub', {xmlns: PubSub.NS_PUBSUB})
                .c('create');
                PubSub.connection.sendIQ(createiq,PubSub.created,PubSub.create_error);
            }          
        } else if (status === Strophe.Status.DISCONNECTED) {
            PubSub.disconnect();
            conn.disconnect();
        }
    }
}

var out = document.getElementById("salir");
out.addEventListener("click", loginOut, false);

function loginOut(){
    PubSub.disconnect();
}
