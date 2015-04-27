#! coding: utf8

import tornado.process
import tornado.websocket
import tornado.web
import tornado.ioloop
import xmpp
import thread
import time
from sys import exit
import json


class Server:
    def __init__(self):
        self.clients = []

    def add_client(self, client):
        self.clients.append(client)

    def delete_client(self, client):
        self.clients.remove(client)


class Client:
    web_socket = None

    nick = None
    room = None
    account = None
    password = None
    cc = None
    members = []

    def __init__(self, ws):
        self.web_socket = ws

    def listen(self):
        self.cc = '0'
        self.web_socket.write_message(self.cc)
        while 1:
            try:
                self.client.Process(1)
            except:
                time.sleep(1)

    def connection(self, nick = u'client_test',
                   room = u'1324@conference.jabber.ru',
                   account = u'testing123testing@jabber.ru',
                   password = u'testing123testing'):
        self.jid = xmpp.protocol.JID(account)
        self.node = self.jid.getNode()
        self.domain = self.jid.getDomain()
        self.password = password

        self.nick = nick
        self.room = room

        self.client = xmpp.Client(self.domain, debug=[])
        self.connection = self.client.connect()
        self.client.RegisterHandler('message', self.message_handler)
        self.client.RegisterHandler('presence', self.presence_handler)

        self.auth = self.client.auth(self.node, self.password)
        self.client.sendInitPresence()
        pres = xmpp.Presence(to='/'.join([self.room, self.nick]))
        pres.setTag('x', namespace=xmpp.NS_MUC).setTagData('password', '')
        pres.getTag('x').addChild('history', {'maxchars': '0', 'maxstanzas': '0'})
        try:
            self.client.send(pres)
        except:
            self.on_disconnect()
        else:
            self.cc = '0'

        thread.start_new_thread(self.listen, ())

    def message_handler(self, sess, mess):
        nick = unicode(mess.getFrom().getResource())
        text = unicode(mess.getBody())
        text = text.replace('\n', '<br>')
        subject = mess.getSubject()
        if subject:
            m = json.dumps({'action': 'topic', 'who': nick, 'body': subject})
            self.web_socket.write_message(m)
        if not nick:
            return
        timestamp = '[' + time.ctime().split(' ')[4:5][0] + ']'
        m = json.dumps({'action': 'message', 'who': nick, 'body': text, 'time':timestamp})
        self.web_socket.write_message(m)

    def presence_handler(self, sess, pres):
        if pres.getFrom().getNode() != self.node:
            nick = pres.getFrom().getResource()
            timestamp = '[' + time.ctime().split(' ')[4:5][0] + ']'
            if nick not in self.members:
                self.members.append(nick)
                m = json.dumps({'action': 'join', 'who': nick, 'count': len(self.members), "time": timestamp})
                self.web_socket.write_message(m)
            if pres.getType() == u'unavailable':
                self.members.remove(nick)
                m = json.dumps({'action': 'leave', 'who': nick, 'count': len(self.members), "time": timestamp})
                self.web_socket.write_message(m)


    def on_message(self, message):
        if self.cc == '0':#connection code, is connected
            reply = xmpp.Message(self.room, unicode(message))
            reply.setType('groupchat')
            self.client.send(reply)
            return
        try:
            nick, room, account, password = message.split('\n')
        except:
            self.on_disconnect()
        if account == '0' or password == '0':
            try:
                self.connection(nick, room)
            except:
                self.on_disconnect()
        else:
            try:
                self.connection(nick, room, account, password)
            except:
                self.on_disconnect()

    def on_disconnect(self):
        if self.cc is '0':
            offPres = xmpp.Presence(typ='unavailable')
            self.client.send(offPres)
            self.client.disconnected()
            self.web_socket.close()
        else:
            self.web_socket.write_message('-1')
            server.delete_client(self)

class SocketHandler(tornado.websocket.WebSocketHandler):
    client = None
    def open(self):
        client = Client(self)
        self.client = client
        server.add_client(client)
        self.write_message('1')

    def on_message(self, message):
        self.client.on_message(message)

    def on_close(self):
        try:
            self.client.on_disconnect()
        except:
            pass
        server.delete_client(self.client)

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


server = Server()

app = tornado.web.Application([
    (r'/', IndexHandler),
    (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css"}),
    (r"/img/(.*)", tornado.web.StaticFileHandler, {"path": "./img"}),
    (r"/js/(.*)", tornado.web.StaticFileHandler, {"path": "./js"}),
    (r"/fonts/(.*)", tornado.web.StaticFileHandler, {"path": "./fonts"}),
    (r'/(favicon.ico)', tornado.web.StaticFileHandler, {'path': './'}),
    (r'/ws', SocketHandler),
])

app.listen(80)
try:
    tornado.ioloop.IOLoop.instance().start()
except (KeyboardInterrupt, SystemExit):
    for cl in server.clients:
        cl.on_disconnect()
