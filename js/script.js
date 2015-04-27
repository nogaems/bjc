var makeCRCTable = function() {
    var c;
    var crcTable = [];
    for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

var crc32 = function(str) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

var dispatch_method = 1;

function set_dispatch_method(m) {
    dispatch_method = m;
    document.textarea = document.getElementById('textarea').focus();
}

window.members = new Array();
window.similar = new Array();
window.tabisused = 0;
window.last = '';
window.entered = '0';

function ls_support() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

if (ls_support()) {
    if (!localStorage.blacklist) {
        blacklist = [''];
        localStorage.blacklist = JSON.stringify(blacklist);
    }
}


window.button = document.getElementsByClassName('log')[0];
var room = document.getElementById('room').value;
var button_bkp = button;
var pd = document.getElementsByClassName('pd')[0];
var pd_bkp = pd;
var base_login = document.getElementsByClassName('login')[0].innerHTML;

window.button.onclick = function() {
    var nick = document.getElementById('nick').value;
    var room = document.getElementById('room').value;
    var anon = 0;

    if (document.getElementById('account')) {
        var account = document.getElementById('account').value;
    } else {
        anon = 1;
        account = 0;
    }
    if (document.getElementById('password')) {
        var password = document.getElementById('password').value;
    } else {
        password = 0;
    }

    if (nick == '') {
        alert('Please enter your nickname');
        return 0;
    }
    if (room == '') {
        alert('Please enter the address of the room');
        return 0;
    }
    if (anon == 0 && account == '') {
        alert('Please enter your jabber-login');
        return 0;
    }
    if (anon == 0 && password == '') {
        alert('Please enter your jabber-password');
        return 0;
    }

    var init = nick + "\n" + room + "\n" + account + "\n" + password;
    document.getElementsByClassName('log')[0].style.display = "none";
    document.getElementsByClassName('pd')[0].style.display = "none";
    var img = document.createElement("img");
    var label = document.createElement("div");
    img.src = "./img/load.gif";
    img.style.width = "25%";
    img.style.height = "25%";
    img.style.hspace = "0";
    img.style.vspace = "0";
    label.innerHTML = "Connection...";
    document.getElementsByClassName('login')[0].appendChild(img);
    document.getElementsByClassName('login')[0].appendChild(label);
    window.ws = new WebSocket('ws://localhost:80/ws');
    window.ws.onopen = function() {}
    window.ws.onclose = function() {
        alert('loss of connection to the server');
    }
    window.ws.onmessage = function(evt) {
        if (evt.data == "1") {
            window.ws.send(init);
        }
        if (evt.data == '0') {
            document.getElementsByClassName('c-theme-conference')[0].innerHTML = room;
            document.getElementsByClassName('login')[0].style.display = 'none';
            document.getElementsByClassName('login__overlay')[0].style.display = 'none';
            document.getElementsByClassName('client')[0].style.display = 'inline';
        }
        if (evt.data == '-1') {
            alert('invalid authorization data');
            img.parentNode.removeChild(img);
            label.parentNode.removeChild(label);
            button.style.display = "block";
            pd.style.display = "block";
        }
        if (evt.data.charAt(0) == '{') {
            var event = JSON.parse(evt.data);
            var color = crc32(event.who);
            var r = Math.floor((color & 0xFF) * .75);
            var g = Math.floor(((color >> 8) & 0xFF) * .75);
            var b = Math.floor(((color >> 16) & 0xFF) * .75);

            var rb = ((color >> 5) & 0xFF) | 0xe0;
            var gb = ((color >> 13) & 0xFF) | 0xe0;
            var bb = ((color >> 21) & 0xFF) | 0xe0;

            switch (event.action) {
                case "message":
                    if (event.who != '') window.entered = 1;
                    blacklist = localStorage.blacklist ? JSON.parse(localStorage.blacklist) : [];
                    for (var i = 0; i < blacklist.length; i++) {
                        if (event.who == blacklist[i]) return;
                    }
                    has_links = /https?\:\/\/\S*/img;
                    if (has_links.test(event.body)) {
                        links = event.body.match(has_links);
                        for (var i = 0; i < links.length; i++) {
                            event.body = event.body.replace(links[i], '<a href="' + links[i] + '" target = "_blank">' + links[i] + '</a>');
                        }
                    }
                    if (event.body.indexOf(nick) + 1) {
                        document.getElementsByClassName('c-messages-text')[0].innerHTML +=
                            "<font style=color:rgb(" + r + "," + g + "," + b + ") >" + event.time + ' &lt;' +
                            event.who + "&gt;</font><strong> " + event.body + "</strong><br>";
                        window.last = event.who;
                        obj = document.getElementsByClassName('c-messages')[0];
                        obj.scrollTop = obj.scrollHeight;
                        break;
                    }
                    document.getElementsByClassName('c-messages-text')[0].innerHTML +=
                        "<font style=color:rgb(" + r + "," + g + "," + b + ")>" + event.time + ' &lt;' +
                        event.who + "&gt;</font> " + event.body + "<br>";
                    obj = document.getElementsByClassName('c-messages')[0];
                    obj.scrollTop = obj.scrollHeight;
                    break;

                case "join":
                    window.members.push(event.who);
                    window.members.sort();
                    blacklist = localStorage.blacklist ? JSON.parse(localStorage.blacklist) : [];
                    var mute = '';
                    document.getElementsByClassName('c-members-list')[0].innerHTML = '';
                    for (var i = 0; i < window.members.length; i++) {
                        var member = document.createElement("div");
                        member.id = window.members[i];
                        for (var j = 0; j < blacklist.length; j++) {
                            if (window.members[i] == blacklist[j]) {
                                mute = 'on';
                                break;
                            } else {
                                mute = 'off';
                                break;
                            }
                        }
                        member.innerHTML = '<a href="javascript:void(0);"><img src="/img/mute_' +
                            mute + '.png" alt="Mute" width="7%" height="7%" class="c-members-nick-mute" onclick="mute(this, \'' +
                            window.members[i] + '\')" id="' + mute + '"></a>' +
                            window.members[i];
                        member.className = 'c-members-nick';
                        document.getElementsByClassName('c-members-list')[0].appendChild(member);
                    }
                    document.getElementsByClassName('c-members-title')[0].innerHTML = "Members (" + event.count + ")";
                    if (window.entered) {
                        document.getElementsByClassName('c-messages-text')[0].innerHTML +=
                            "<font style=color:#59ac59>" + event.time + ' *** &lt;' + event.who + "&gt; has joined the room</font><br>";
                    }
                    obj = document.getElementsByClassName('c-messages')[0];
                    obj.scrollTop = obj.scrollHeight;
                    break;

                case "leave":
                    for (var i = 0; i < window.members.length; i++) {
                        if (window.members[i] == event.who) {
                            window.members.splice(i, 1);
                            break;
                        }
                    }
                    window.members.sort();
                    document.getElementsByClassName('c-members-list')[0].removeChild(document.getElementById(event.who));
                    document.getElementsByClassName('c-members-title')[0].innerHTML = "Members (" + event.count + ")";
                    document.getElementsByClassName('c-messages-text')[0].innerHTML +=
                        "<font style=color:#59ac59>" + event.time + ' *** &lt;' + event.who + "&gt; has left the room</font><br>";
                    obj = document.getElementsByClassName('c-messages')[0];
                    obj.scrollTop = obj.scrollHeight;
                    break;

                case "topic":
                    document.getElementsByClassName('c-theme-text')[0].innerHTML = "Тема: " + event.body;
                    break;

                default:
                    break;
            }

        }
    }
}

function show_more() {
    var parent = document.getElementsByClassName('login')[0].parentNode;
    var new_login_html = '<div class="login">' +
        '<p>Welсome!</p>' +
        '<p>Enter the group chat you want to join <br>and the nick you want to have.</p>' +
        '<p>Room: <input type="text" id="room" value="1324@conference.jabber.ru"></p>' +
        '<p>Nick: <input type="text" id="nick" value="test1tes"></p>' +
        '<p>Account: <input type="text" id="account" value=""></p>' +
        '<p>Pass: <input type="text" id="password" value=""></p>' +
        '<input type="button" value="Log in" class="log"/>' +
        '<p></p>' +
        '<a href="#"><img src="./img/pu.png" height="5%" width="5%" class="pd" onclick="roll_up()"></a>' +
        '</div>';
    parent.removeChild(document.getElementsByClassName('login')[0]);
    var new_login = document.createElement("div");
    new_login.innerHTML = new_login_html;
    parent.appendChild(new_login);
    document.getElementsByClassName('log')[0].onclick = window.button.onclick;
}

function roll_up() {
    var parent = document.getElementsByClassName('login')[0].parentNode;
    parent.removeChild(document.getElementsByClassName('login')[0]);
    var new_login = document.createElement("div");
    new_login.innerHTML = base_login;
    new_login.className = "login";
    parent.appendChild(new_login);
    document.getElementsByClassName('log')[0].onclick = window.button.onclick;
}

document.getElementsByClassName('c-bsubmit')[0].onclick = function() {
    textarea = document.getElementById('textarea');
    if (textarea.value != '') {
        window.ws.send(textarea.value);
        textarea.value = '';
    }
}

function mute(icon, name) {
    if (icon.id == 'on') {
        blacklist = localStorage.blacklist ? JSON.parse(localStorage.blacklist) : [];
        for (var i = 0; i < blacklist.length; i++) {
            if (name == blacklist[i]) {
                blacklist = blacklist.splice(i, 1);
                icon.id = 'off';
                break;
            }
        }
        localStorage.blacklist = JSON.stringify(blacklist);
        icon.src = 'img/mute_off.png';
    } else {
        blacklist = localStorage.blacklist ? JSON.parse(localStorage.blacklist) : [];
        blacklist = [name, blacklist]
        localStorage.blacklist = JSON.stringify(blacklist);
        icon.id = 'on';
        icon.src = 'img/mute_on.png';
    }

}

document.onkeydown = function checkKeycode(event) {
    var keycode;
    if (!event) var event = window.event;
    if (event.keyCode) keycode = event.keyCode; // IE
    else if (event.which) keycode = event.which; // all browsers
    if (keycode == 9) {
        if (document.getElementsByClassName('login')[0].style.display != 'none') {
            return;
        }
        event.preventDefault();
        if (window.tabused == -1) {
            return;
        }
        if (window.tabisused == 0) {
            for (var i = 0; i < window.members.length; i++) {
                if (window.members[i].indexOf(document.getElementById('textarea').value) == 0) {
                    window.similar.push(window.members[i]);
                }
            }
            window.similar.sort();
            if (document.getElementById('textarea').value == '') {
                window.similar = [window.last, window.similar];
            }
            window.tabisused = 1;
            if (window.similar[0]) {
                document.getElementById('textarea').value = window.similar[0] + ', ';
                window.similar.splice(0, 1);
                window.tabisused = 1;
            } else {
                return;
            }
        } else {
            if (window.similar[0]) {
                document.getElementById('textarea').value = window.similar[0] + ', ';
                window.similar.splice(0, 1);
            }
        }
    }
    if (keycode == 13 && document.getElementsByClassName('login')[0].style.display != 'none') {
        window.button.onclick();
        return;
    }
    window.tabisused = 0;
    window.similar = [];
    if (dispatch_method == 1) {
        if (keycode == 13 && !event.shiftKey) {
            event.preventDefault();
            document.getElementsByClassName('c-bsubmit')[0].onclick();
        }
    }
    if (dispatch_method == 2) {
        if (keycode == 13 && event.shiftKey) {
            event.preventDefault();
            document.getElementsByClassName('c-bsubmit')[0].onclick();
        }
    }
}
