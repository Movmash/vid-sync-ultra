const roomPanel = document.getElementById("room")
const slideButton = document.getElementById("slide")
const chatMenuBtn = document.getElementById("chatMenu")
const fileMenuBtn = document.getElementById("fileMenu")
const chatPanel = document.getElementById("chat")
const filePanel = document.getElementById("filelist")
const createBtn = document.getElementById("create")
const joinBtn = document.getElementById("join")
const textFeild = document.getElementById("text");
const messageInput = document.getElementById("messageInput")
const sendMessageBtn = document.getElementById("send")
const messageList = document.getElementById("chatList")
const buttonList = document.getElementById("buttonList")
const leaveButton = document.getElementById("leave")
const originSelectionPanel = document.getElementById("originSelection")
const originInput = document.getElementById("originInput")
const originConnectBtn = document.getElementById("connect")
const slideIcon = document.getElementById("slideIcon")
const globalContainer = document.getElementById("container")
const captionPanel = document.getElementById("captionPanel")
const captionBtn = document.getElementById("captionMenu");
const popupWindow = !0,
  video = document.getElementById("video"),
  playerPanel = document.getElementById("player");


class RoomManager {
  static init() {

    slideButton.addEventListener("click",() => this.onClickSlide())
    createBtn.addEventListener("click", () => this.onEnterRoom(true));
    joinBtn.addEventListener("click", () => this.onEnterRoom(false))
    chatMenuBtn.addEventListener("click", () => this.onClickMenu("chat"));
    fileMenuBtn.addEventListener("click", () => this.onClickMenu("file"));
    captionBtn.addEventListener("click", () => this.onClickMenu("caption"))
    leaveButton.addEventListener("click", () => this.onLeaveRoom())
  }
  static updateRoomFile(files) {
    filePanel.innerHTML = ""
    files.forEach((f,i) => {
      const fileCard = UIManager.buildFileCard(f, i)
      filePanel.appendChild(fileCard);
    });
  }

  static onEnterRoom(host = false) {
    Socket.init();
    const { socket } = Socket
    const textInput = textFeild.value
    if (textInput !== "") {
      RoomManager.roomInfo.roomId = textInput;
      RoomManager.roomInfo.host = host;
      RoomManager.roomInfo.isJoined = true;
      socket.emit("joinroom", RoomManager.roomInfo);
      SyncVideo.init()
      ChatManager.init();
      UIManager.changeUIOnJoin();
    }
  }

  static onLeaveRoom() {
    const { socket } = Socket;
    const {roomInfo} = this
    roomInfo.host = false;
    roomInfo.isJoined = false;
    roomInfo.roomId = "";
    socket.disconnect();
    UIManager.changeUIOnleave();
  };

  static onClickSlide() {
    if (!RoomManager.toggle) {
      roomPanel.classList.add("hide");
      playerPanel.classList.add("hide");
      slideIcon.src = "./img/leftIcon.svg"
    } else {
      roomPanel.classList.remove("hide");
      playerPanel.classList.remove("hide");
      slideIcon.src = "./img/rightIcon.svg"
    }
    RoomManager.toggle = !RoomManager.toggle
  }

  static onClickMenu(option) {
    if (option === "chat") {
      chatPanel.style.zIndex = 5;
      filePanel.style.zIndex = 0;
      captionPanel.style.zIndex = 0;
      chatMenuBtn.classList.add("select");
      fileMenuBtn.classList.remove("select");
      captionBtn.classList.remove("select")
    } 
    if (option === "file") {
      chatPanel.style.zIndex = 0;
      filePanel.style.zIndex = 5;
      captionPanel.style.zIndex = 0;
      fileMenuBtn.classList.add("select");
      chatMenuBtn.classList.remove("select");
      captionBtn.classList.remove("select")
    }
    if (option === "caption") {
      chatPanel.style.zIndex = 0;
      filePanel.style.zIndex = 0;
      captionPanel.style.zIndex = 5;
      captionBtn.classList.add("select");
      fileMenuBtn.classList.remove("select");
      chatMenuBtn.classList.remove("select");
    }
  }

}
RoomManager.roomInfo = {
  roomId : "",
  host: false,
  isJoined: false,
  name: generateRandomName(),
}
RoomManager.toggle = false


class Socket {
  static init() {
    this.socket = io(this.serverOrigin);
    const socket = this.socket;
    socket.on("joinroom", (data) => {
      console.table(data)
    });
  }  
}    
Socket.socket = {}
Socket.serverOrigin = ""

class SyncVideo {
  static init(){
    const socket  = Socket.socket;
    const { host, roomId } = RoomManager.roomInfo;
    const { videoState,} = this
    socket.on("onpause", (data) => {
      if (host) return;
      this.syncVideoTo(data.videoState);
    });  

    socket.on("onplay", (data) => {
      if (host) return;
      this.syncVideoTo(data.videoState);
    });  

    socket.on("onseeked", (data) => {
      if (host) return;
      this.syncVideoTo(data.videoState);
    })  

    socket.on("onplaynext", data => {
      if (host) return;
      this.syncVideoTo(data.videoState)
    })

    socket.on("onplayprevious", data => {
      if (host) return;
      this.syncVideoTo(data.videoState)
    })
    socket.on("syncwithhost", () => {
      if (!host) return;
      this.updateState();
      console.log("requesting user for the source data");
      socket.emit("hostvideostate", { roomId, videoState });
    });  

    socket.on("hostvideostate", (data) => {
      if (host) return;
      this.updateState();
      this.hostVideoState["paused"] = data.hostVideoState["paused"];
      this.hostVideoState["currentTime"] = data.hostVideoState["currentTime"];
      this.hostVideoState["playbackRate"] = data.hostVideoState["playbackRate"];
      this.hostVideoState["playIndex"] = data.hostVideoState["playIndex"]
      this.syncVideoTo(this.hostVideoState);
    });  

    if (!RoomManager.roomInfo.host) this.syncVideoWithHost();

  }  
  static updateState() {
    this.videoState["paused"] = video.paused;
    this.videoState["currentTime"] = video.currentTime;
    this.videoState["playbackRate"] = video.playbackRate;
    this.videoState["playIndex"] = FileManager.playIndex;
    return this.videoState;
  }  

  static updateHostState() {
    this.hostVideoState["paused"] = video.paused;
    this.hostVideoState["currentTime"] = video.currentTime;
    this.hostVideoState["playbackRate"] = video.playbackRate;
    this.hostVideoState["playIndex"] = FileManager.playIndex;
    return this.hostVideoState;
  }  

  static syncVideoTo(srcState) {
    console.log("syncing...");
    console.log(srcState, this.videoState)
    if(FileManager.playIndex !== srcState["playIndex"]){
      Player.selectVideo(srcState["playIndex"])
    }
    video.currentTime = srcState["currentTime"];
    video.playbackRate = srcState["playbackRate"];
    if (!srcState["paused"]) Player.play();
    else video.pause();
    this.updateState();
    this.updateHostState();
  };  

  static syncVideoWithHost() {
    const { host, roomId, isJoined } = RoomManager.roomInfo;
    const {socket} = Socket
    if(Object.keys(socket).length === 0) return
    if (host) return;
    this.updateState();
    console.log("sync with host");
    if (!Object.keys(this.hostVideoState).length)
      return socket.emit("syncwithhost", { roomId });

    const hostCurrTime = this.hostVideoState["currentTime"];  
    const userCurrTime = this.videoState["currentTime"];
    const pauseState = !(this.hostVideoState["paused"] === this.videoState["paused"]);
    const playbackState = !(
      this.hostVideoState["playbackRate"] == this.videoState["playbackRate"]
    );  
    const currentTimeState = Math.abs(hostCurrTime - userCurrTime) > 2;
    console.log({ pauseState, playbackState, currentTimeState });
    console.log(pauseState || playbackState || currentTimeState);

    if (pauseState || playbackState || currentTimeState)
      return socket.emit("syncwithhost", { roomId });
  };    

  static onplay = () => {
    const {host, roomId, isJoined} = RoomManager.roomInfo
    if(!isJoined) return
    const {socket} = Socket
    const {videoState} = this
    if (!host) {
      this.syncVideoWithHost();
      return;
    }  
    this.updateState();
    socket.emit("onplay", { roomId, videoState });
  };  

  static onpause = () => {
    const { host, roomId, isJoined } = RoomManager.roomInfo
    if (!isJoined) return
    const { socket } = Socket
    const { videoState } = this
    if (!host) {
      this.syncVideoWithHost();
      console.log("user is not sync with host");
      return;
    }  
    this.updateState();
    socket.emit("onpause", { roomId, videoState });
  };  

  static onseeked = (e) => {
    const { host, roomId } = RoomManager.roomInfo
    const { socket } = Socket
    const { videoState } = this
    if (!host) {
      this.syncVideoWithHost();
      return;
    }  
    this.updateState();
    socket.emit("onseeked", { roomId, videoState });
  }
  
  static onplaynext = () => {
    const { host, roomId } = RoomManager.roomInfo
    const { socket } = Socket
    const { videoState } = this
    if (!host) {
      this.syncVideoWithHost();
      return;
    } 
    this.updateState()
    socket.emit("onplaynext", { roomId, videoState });
  }

  static onplayprevious = () => {
    const { host, roomId } = RoomManager.roomInfo
    const { socket } = Socket
    const { videoState } = this
    if (!host) {
      this.syncVideoWithHost();
      return;
    } 
    this.updateState();
    socket.emit("onplayprevious", { roomId, videoState });
  }

}  

SyncVideo.hostVideoState = {};

SyncVideo.videoState = {
  paused: video.paused,
  currentTime: video.currentTime,
  playbackRate: video.playbackRate,
  playIndex: 0
};

class UIManager {
  static init() {
    var textarea = messageInput;
    this.autoResize(textarea);
    textarea.addEventListener('input',() => UIManager.autoResize(textarea));
    textarea.addEventListener("focus", () => UIManager.onClickTextArea());
    textarea.addEventListener("blur", () => UIManager.onReleaseTextArea());
    textarea.addEventListener("keydown", (e) => UIManager.onChangeLine(e))
  }
  static onChangeLine(e) {
    if (e.shiftKey && e.keyCode === 13) {
      var currentValue = messageInput.value;
      messageInput.value = currentValue + "\n";
    } else if (e.key === "Enter") {
      e.preventDefault();
      ChatManager.onSendMessage();
    }
  }
  static onClickTextArea() {
    if(!UIManager.isTextAreaTyping) {
      document.body.removeEventListener("keydown", Controls.keyboardListener);
    }
  }
  static onReleaseTextArea() {
    if(!UIManager.isTextAreaTyping) {
      document.body.addEventListener("keydown", Controls.keyboardListener);
    }
  }
  static autoResize(textarea){
    UIManager.isTextAreaTyping = true
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
    UIManager.isTextAreaTyping = false
  }
  static changeUIOnJoin() {
    buttonList.classList.add("invisible")
    leaveButton.classList.remove("invisible")
  }
  static changeUIOnleave() {
    buttonList.classList.remove("invisible")
    leaveButton.classList.add("invisible")
  }
  static scrollToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
  }
  static buildMessageCard(messageData) {
    const {message, name} = messageData
    const isMine = RoomManager.roomInfo.name === name
    const messageContainer = document.createElement("div")
    const nameContainer = document.createElement("span")
    const m = document.createElement("p")
    m.innerHTML = message
    nameContainer.innerHTML = name
    messageContainer.appendChild(nameContainer)
    messageContainer.appendChild(m)
    messageContainer.id = "messageContainer"
    messageContainer.classList.add(`${isMine? "mine" : "others"}`)
    return messageContainer;
  }
  static buildFileCard(file, index) {
    const newFileMenu = document.createElement("div")
    const p = document.createElement("p")
    p.innerHTML = file.name
    const playButton = document.createElement("button")
    const img = document.createElement("img")
    img.src = "./img/playIcon.svg"
    playButton.appendChild(img)
    playButton.addEventListener("click", () => Player.selectVideoAndPlay(index))
    p.addEventListener("animationend", function () {
      p.style.transform = "translateX(" + newFileMenu.offsetWidth + "px)";
    });

    newFileMenu.id = "fileContainer";
    newFileMenu.appendChild(p)
    newFileMenu.appendChild(playButton)


    return newFileMenu;
  }

  static buildCaptionCard(file, index) {
    const captionFileContainer = document.createElement("div")
    const p = document.createElement("p")
    p.innerHTML = file.name
    const addButton = document.createElement("button")
    const img = document.createElement("img")
    img.src = "./img/addIcon.svg"
    addButton.appendChild(img)
    addButton.addEventListener("click", () => CaptionManager.selectSubtitle(index))
    p.addEventListener("animationend", function () {
      p.style.transform = "translateX(" + captionFileContainer.offsetWidth + "px)";
    });

    captionFileContainer.id = "captionFileContainer";
    captionFileContainer.appendChild(p)
    captionFileContainer.appendChild(addButton)


    return captionFileContainer;
  }
}
UIManager.isTextAreaTyping = false
class ChatManager {
  static init(){
    const {socket} = Socket
    const joinMessage = `${RoomManager.roomInfo.name} joined`
    const welcomeMessage = "Welcome to this room"
    this.addMessageToList({message: welcomeMessage, ...RoomManager.roomInfo})
    socket.emit("notify", {message: joinMessage, ...RoomManager.roomInfo})
    socket.on("notify", data => {
      console.log(data)
      this.addMessageToList(data)
    })
    socket.on("chatmessage", (data) => {
      this.addMessageToList(data);
    })

    messageInput.removeAttribute("disabled")
    sendMessageBtn.removeAttribute("disabled")

    sendMessageBtn.addEventListener("click",() => this.onSendMessage())
    
  }
  static addMessageToList(messageData) {
    const messageCard = UIManager.buildMessageCard(messageData)
    messageList.appendChild(messageCard)
    UIManager.scrollToBottom()
  }
  static onSendMessage() {
    const message = messageInput.value;
    messageInput.value = ""
    const {name, host, roomId} = RoomManager.roomInfo;
    const {socket} = Socket
    message.trim();
    if(message === "") return;
    const messageData = { message, name, host, roomId } 
    this.addMessageToList(messageData)
    messageInput.style.height = "fit-content"
    socket.emit("chatmessage", messageData);
  }
}

class OriginManager {
  static init(){
    originInput.defaultValue = "https://bb54-49-37-65-137.in.ngrok.io"
    originConnectBtn.addEventListener("click", () => this.onConnect())
  }
  
  static onConnect() {
    const originLink = originInput.value.trim()
    if(originLink !== "") {
      Socket.serverOrigin = originLink
      originSelectionPanel.classList.add("invisible")
    }
      
  }
}

const captionInput = document.getElementById("captionInput")
const captionList = document.getElementById("captionList")

class CaptionManager {
  static init() {
    captionInput.addEventListener("change", () => CaptionManager.onChangeCaptionFile())
    CaptionManager.reader.addEventListener("load", e => CaptionManager.onReaderLoad(e));
  }
  static onReaderLoad(e) {
    const srtText = e.target.result;
    const srtUrl = URL.createObjectURL(new Blob([srtText], { type: "text/srt" }));
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = "English";
    track.srclang = "en";
    track.default = true;
    track.src = srtUrl;
    video.appendChild(track);
  }
  static onChangeCaptionFile() {
    CaptionManager.fileList = Array.from(captionInput.files)
    const b = new Intl.Collator();
    CaptionManager.fileList.sort((c, d) => b.compare(c.name, d.name));
    
    this.updateCaptionPanel(this.fileList);
  }

  static updateCaptionPanel(files) {
    captionList.innerHTML = ""
    files.forEach((f, i) => {
      const captionCard = UIManager.buildCaptionCard(f, i)
      captionList.appendChild(captionCard);
    });
  }

  static selectSubtitle(index) {
    console.log(index);
    const file = CaptionManager.fileList[index]
    CaptionManager.reader.readAsText(file)
  }
}

CaptionManager.fileList = []
CaptionManager.reader = new FileReader()