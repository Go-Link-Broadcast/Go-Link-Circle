//#1
let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

//#2
let config = {
  appid: "f6af49d5a9d6465797fca7e81505b546", //needed
  token: "007eJxTYNB8d96lSOeGwfGUhVZXFX+K6xaavePrfabZwiCat+SouZMCQ5pZYpqJZYppomWKmYmZqbmleVpyonmqhaGpgWmSqYnZyrYN6Q2BjAyiW01YGRkgEMTnZHDP98nMyw5zNmRgAACB6R8n", //needed
  uid: null,
  channel: "GoLinkVC1", //needed
};

//#3 - Setting tracks for when user joins
let localTracks = {
  audioTrack: null,
  videoTrack: null,
};

//#4 - Want to hold state for users audio and video so user can mute and hide
let localTrackState = {
  audioTrackMuted: false,
  videoTrackMuted: false,
};

//#5 - Set remote tracks to store other users
let remoteTracks = {};

//chat
let chatVisible = false; // Tracks chat visibility
let messageCount = 0; // Tracks new message count
let lastMessageTimestamp = null; // Tracks the timestamp of the last fetched message

//Method will take all my info and set user stream in frame
let joinStreams = async () => {
  //Is this place hear strategically or can I add to end of method?

  client.on("user-published", handleUserJoined);
  client.on("user-left", handleUserLeft);

  client.enableAudioVolumeIndicator(); // Triggers the "volume-indicator" callback event every two seconds.
  client.on("volume-indicator", function (evt) {
    for (let i = 0; evt.length > i; i++) {
      let speaker = evt[i].uid;
      let volume = evt[i].level;
      const videoContainer = document.getElementById(
        `video-wrapper-${speaker}`
      );

      if (volume > 0) {
        document.getElementById(`volume-${speaker}`).src =
          "./assets/volume-on.svg";
        if (videoContainer) {
          videoContainer.classList.add("speaking");
          if (!document.querySelector(".fullscreen")) {
            document.getElementById("user-streams").prepend(videoContainer);
          }
        }
      } else {
        document.getElementById(`volume-${speaker}`).src =
          "./assets/volume-off.svg";
        if (videoContainer) {
          videoContainer.classList.remove("speaking");
        }
      }
    }
  });

  //#6 - Set and get back tracks for local user
  [config.uid, localTracks.audioTrack, localTracks.videoTrack] =
    await Promise.all([
      client.join(
        config.appid,
        config.channel,
        config.token || null,
        config.uid || null
      ),
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);

  // Auto-mute audio track
  await localTracks.audioTrack.setMuted(true);
  localTrackState.audioTrackMuted = true;
  document.getElementById("mic-btn").style.backgroundColor =
    "rgb(255, 80, 80, 0.7)";
  let player = `<div class="video-containers" id="video-wrapper-${config.uid}">
                    <p class="user-uid"><img class="volume-icon" id="volume-${config.uid}" src="./assets/volume-on.svg" /> ${config.uid}</p>
                    <div class="video-player player" id="stream-${config.uid}"></div>
                    <div class="video-logo">
                        <img src="./assets/Go-Link-logo2.png" alt="Go-Link Logo" />  
                    </div>
                     <div class="video-settings">
                    <button class="settings-btn" onclick="showSettingsMenu('${config.uid}')">⋮</button>
                    <div class="settings-menu" id="settings-menu-${config.uid}">
                        <button onclick="dontWatch('${config.uid}')">Don’t Watch</button>
                        <button onclick="pinVideo('${config.uid}')">Pin</button>
                        <button onclick="fullScreenVideo('${config.uid}')">Full Screen</button>
                        <button onclick="cancelSettings('${config.uid}')">Cancel</button>
                    </div>
                </div>
              </div>`;
  document
    .getElementById("user-streams")
    .insertAdjacentHTML("beforeend", player);

  if (localTrackState.videoTrackMuted) {
    const placeholderImg = `<img class="placeholder-img" id="placeholder-${config.uid}" src="./assets/User_Avatar1.png" alt="Camera Off"/>`;
    document
      .getElementById(`video-wrapper-${config.uid}`)
      .insertAdjacentHTML("beforeend", placeholderImg);
  }

  localTracks.videoTrack.play(`stream-${config.uid}`);

  await client.publish([localTracks.audioTrack, localTracks.videoTrack]);
};

const autoCameraOff = localStorage.getItem('autoCameraOff') === 'true';
document.getElementById('auto-camera-off').checked = autoCameraOff;

// Chat UI Setup || <span id="message-count" style="background: red; color: white; padding: 2px 5px; border-radius: 50%; font-size: 14px; display: none;">0</span>
document.getElementById("footer").insertAdjacentHTML(
  "beforeend",
  `
  <div id="chat-container" style="display:none;">
    <div id="chat-messages" class="chat-messages"></div>
    <div class="chat-input-wrapper">
      <input id="chat-input" type="text" placeholder="Type your message..." />
      <button id="send-btn">Send</button>
    </div>
  </div>
  `
);
// Chat CSS
const style = document.createElement("style");
style.textContent = `
#chat-container {
  position: fixed;
  bottom: 110px;
  right: 10px;
  width: 300px;
  height: 400px;
  background-color: white;
  border: 1px solid #444;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
}

#chat-messages {
  flex-grow: 1; /* Allows it to take all available space */
  overflow-y: auto;
  padding: 10px;
  margin: 0; /* Ensure no extra margin */
  color: black;
}

.chat-input-wrapper {
  display: fixed;
  border-top: 1px solid #444;
}

#chat-input {
  flex-grow: 1;
  padding: 10px;
  border: none;
  background-color: #2c2c2c;
  color: #fff;
  margin: 0; /* Ensure no extra margin */
}

#send-btn {
  background-color: #007bff;
  color: #fff;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
}

#send-btn:hover {
  background-color: #0056b3;
}
#message-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: red;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  padding: 2px 6px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
  .chat-icon-container {
  position: relative;
  display: inline-block;
}

.system-message {
  background-color: rgba(0, 0, 0, 0.05);
  font-style: italic;
}

.message-time {
  font-size: 0.8em;
  color: #666;
  margin-top: 2px;
}

.message-container {
  margin-bottom: 8px;
  padding: 6px;
  border-radius: 4px;
}
`;
document.head.appendChild(style);
// Add emoji picker to chat input
document.querySelector(".chat-input-wrapper").insertAdjacentHTML(
  "beforeend",
  `<button class="emoji-btn">😊</button>
  <div class="emoji-picker">
    <div class="emoji-grid">
       🙏
    </div>
    <div class="emoji-grid">
       👏 
    </div>
    <div class="emoji-grid">
      👊
    </div>
    <div class="emoji-grid">
      😅
    </div>
    <div class="emoji-grid">
      🤣
    </div>
    <div class="emoji-grid">
      🔥
    </div>
    <div class="emoji-grid">
      👍
    </div>
    <div class="emoji-grid">
      🎉
    </div>
    <div class="emoji-grid">
      😭
    </div>
    <div class="emoji-grid">
      🫤
    </div>
    <div class="emoji-grid">
      😲
    </div>
    <div class="emoji-grid">
      🤯
    </div>
    <div class="emoji-grid">
      🤑
    </div>
    <div class="emoji-grid">
      🤩
    </div>
    <div class="emoji-grid">
      👌
    </div>
    <div class="emoji-grid">
      ✊
    </div>
    <div class="emoji-grid">
      🤝
    </div>
    <div class="emoji-grid">
      🎯
    </div>
  </div>
`
);
// Emoji picker functionality
const emojiBtn = document.querySelector(".emoji-btn");
const emojiPicker = document.querySelector(".emoji-picker");
const chatInput = document.getElementById("chat-input");
emojiBtn.addEventListener("click", () => {
  emojiPicker.classList.toggle("active");
});
document.querySelectorAll(".emoji-grid").forEach((emoji) => {
  emoji.addEventListener("click", (e) => {
    if (e.target.textContent.trim()) {
      chatInput.value += e.target.textContent.trim();
      emojiPicker.classList.remove("active");
    }
  });
});

// Chat Button Toggle
document.getElementById("chat-btn").addEventListener("click", () => {
  chatVisible = !chatVisible;
  document.getElementById("chat-container").style.display = chatVisible
    ? "block"
    : "none";
  if (chatVisible) {
    document.getElementById("message-count").style.display = "none";
    messageCount = 0; // Reset new message count
  }
});

// Click Outside to Close Chat
document.addEventListener("click", (event) => {
  if (
    chatVisible &&
    !document.getElementById("chat-container").contains(event.target) &&
    !document.getElementById("chat-btn-wrapper").contains(event.target)
  ) {
    chatVisible = false;
    document.getElementById("chat-container").style.display = "none";
  }
});

// Fetch Messages from Google Sheets
const fetchMessages = async () => {
  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbzk4EZOv4GvdIqyBygvIS5zF6Kl7V00DruZkkDpi2JpBK0RRppIaNcQ-ol8lks3KI2b1A/exec?action=getMessages"
    );
    const messages = await response.json();

    // Update chat messages
    const chatMessagesDiv = document.getElementById("chat-messages");
    chatMessagesDiv.innerHTML = "";
    messages.forEach(({ timestamp, username, message }) => {
      const time = new Date(timestamp).toLocaleTimeString();
      // Detect URLs and make them clickable
      const formattedMessage = message.replace(
        /(\bhttps?:\/\/[^\s]+)/gi,
        '<a href="$1" target="_blank">$1</a>'
      );
      chatMessagesDiv.innerHTML += `<p><strong>${username}</strong> : ${formattedMessage}</p>`;
    });

    // Scroll to the bottom of the chat
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

    // Check for new messages
    if (lastMessageTimestamp) {
      const newMessages = messages.filter(
        ({ timestamp }) => new Date(timestamp) > new Date(lastMessageTimestamp)
      );
      if (newMessages.length > 0 && !chatVisible) {
        messageCount += newMessages.length;
        document.getElementById("message-count").textContent = messageCount;
        document.getElementById("message-count").style.display = "block";
      }
    }

    lastMessageTimestamp = messages[messages.length - 1]?.timestamp;
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
};

// Send Message to Google Sheets
const sendMessage = async (username, message) => {
  try {
    await fetch(
      "https://script.google.com/macros/s/AKfycbzk4EZOv4GvdIqyBygvIS5zF6Kl7V00DruZkkDpi2JpBK0RRppIaNcQ-ol8lks3KI2b1A/exec",
      {
        method: "POST",
        body: JSON.stringify({ username, message }),
      }
    );
    fetchMessages();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// Send Button Event Listener
document.getElementById("send-btn").addEventListener("click", () => {
  const message = document.getElementById("chat-input").value;
  const username = config.uid || "Anonymous User";
  if (message) {
    sendMessage(username, message);
    document.getElementById("chat-input").value = ""; // Clear input
  }
});

// Periodically Fetch Messages
setInterval(fetchMessages, 2000);

//Full Screen Display
document.addEventListener("dblclick", (e) => {
  const videoContainer = e.target.closest(".video-containers");
  if (!videoContainer) return;
  const currentFullscreen = document.querySelector(".fullscreen");
  const currentMinimized = document.querySelector(".minimized");
  if (currentFullscreen === videoContainer) {
    videoContainer.classList.remove("fullscreen");
    if (currentMinimized) {
      currentMinimized.classList.remove("minimized");
    }
  } else {
    if (currentFullscreen) {
      currentFullscreen.classList.remove("fullscreen");
    }
    if (currentMinimized) {
      currentMinimized.classList.remove("minimized");
    }
    videoContainer.classList.add("fullscreen");

    document.querySelectorAll(".video-containers").forEach((container) => {
      if (container !== videoContainer) {
        container.classList.add("minimized");
      }
    });
  }
});
//Join Button Action
document.getElementById("join-btn").addEventListener("click", async () => {
  config.uid = document.getElementById("username").value;
  await joinStreams();
  document.getElementById("join-wrapper").style.display = "none";
  document.getElementById("footer").style.display = "flex";
  // Show users list button after joining
  document.getElementById("users-list-btn").style.display = "block";
});

//Mic Button Action
document.getElementById("mic-btn").addEventListener("click", async () => {
  //Check if what the state of muted currently is
  //Disable button
  if (!localTrackState.audioTrackMuted) {
    //Mute your audio
    await localTracks.audioTrack.setMuted(true);
    localTrackState.audioTrackMuted = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 80, 80, 0.7)";
  } else {
    await localTracks.audioTrack.setMuted(false);
    localTrackState.audioTrackMuted = false;
    document.getElementById("mic-btn").style.backgroundColor = "#1f1f1f8e";
  }
});
// Add audio activity detection
client.on("volume-indicator", function (evt) {
  evt.forEach(({ uid, level }) => {
    const videoContainer = document.getElementById(`video-wrapper-${uid}`);
    if (videoContainer) {
      if (level > 0) {
        videoContainer.classList.add('active-speaker');
      } else {
        videoContainer.classList.remove('active-speaker');
      }
    }
  });
});
// Pin Video Function
function pinVideo(uid) {
  const videoContainer = document.getElementById(`video-wrapper-${uid}`);
  if (videoContainer) {
    videoContainer.classList.toggle('pinned');

    if (videoContainer.classList.contains('pinned')) {
      document.getElementById('user-streams').prepend(videoContainer);
    } else {
      document.getElementById('user-streams').appendChild(videoContainer);
    }

    const allContainers = document.querySelectorAll('.video-containers');
    allContainers.forEach(container => {
      if (container !== videoContainer) {
        if (videoContainer.classList.contains('pinned')) {
          container.style.height = '150px';
        } else {
          container.style.height = 'auto';
        }
      }
    });
  }
}

// Mobile Controls Show/Hide
let controlsVisible = true;
document.addEventListener('click', () => {
  controlsVisible = !controlsVisible;
  document.getElementById('footer').style.display = controlsVisible ? 'flex' : 'none';
});

// Swipe Gestures for Pinned Videos
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  if (touchEndX < touchStartX) {
    // Swipe left
    const pinnedVideo = document.querySelector('.video-containers.pinned');
    if (pinnedVideo) {
      pinVideo(pinnedVideo.id.replace('video-wrapper-', ''));
    }
  }
  if (touchEndX > touchStartX) {
    // Swipe right
    const pinnedVideo = document.querySelector('.video-containers.pinned');
    if (pinnedVideo) {
      pinVideo(pinnedVideo.id.replace('video-wrapper-', ''));
    }
  }
}

//Camera Button Action
document.getElementById("camera-btn").addEventListener("click", async () => {
  if (!localTrackState.videoTrackMuted) {
    await localTracks.videoTrack.setMuted(true);
    localTrackState.videoTrackMuted = true;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 80, 80, 0.7)";
    addPlaceholderImage(config.uid);
  } else {
    await localTracks.videoTrack.setMuted(false);
    localTrackState.videoTrackMuted = false;
    document.getElementById("camera-btn").style.backgroundColor = "#1f1f1f8e";
    const placeholder = document.querySelector(".placeholder-container");
    if (placeholder) {
      placeholder.remove();
    }
  }
});

const addUsersList = () => {
  const usersListBtn = document.createElement("div");
  usersListBtn.className = "icon-wrapper";
  usersListBtn.innerHTML = `
    <button class="control-icon" id="users-list-btn" style="display: none;">
      <img src="./assets/people-svgrepo-com.svg" alt="Users" />
    </button>
    <p>Participants</p>
  `;
  document.getElementById("footer").insertBefore(usersListBtn, document.getElementById("leave-btn").parentElement);

  const usersSidebar = document.createElement("div");
  usersSidebar.id = "users-sidebar";
  usersSidebar.style.cssText = `
    position: fixed;
    right: -390px;
    top: 0;
    width: 260px;
    height: 100vh;
    background:rgb(0, 0, 0);
    transition: right 0.3s ease;
    padding: 20px;
    color: white;
    z-index: 1000;
  `;
  document.body.appendChild(usersSidebar);

  let isSidebarOpen = false;
  document.getElementById("users-list-btn").addEventListener("click", () => {
    isSidebarOpen = !isSidebarOpen;
    usersSidebar.style.right = isSidebarOpen ? "0" : "-300px";
  });

  const updateUsersList = () => {
    const users = [config.uid, ...Object.keys(remoteTracks)];
    usersSidebar.innerHTML = `
      <h3 style="margin-bottom: 20px; font-size: 1.5em;">Participants (${users.length})</h3>
      ${users.map(uid => `
        <div class="user-item" style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
          <span>${uid}</span>
          <div class="user-settings">
            <button class="settings-btn" onclick="showSettingsMenu('${uid}')">⋮</button>
            <div class="settings-menu" id="settings-menu-${uid}">
              <button onclick="dontWatch('${uid}')">Watch / Don’t Watch</button>
              <button onclick="pinVideo('${uid}')">Pin / UnPin</button>
              <button onclick="fullScreenVideo('${uid}')">Full Screen</button>
              <button onclick="cancelSettings('${uid}')">Cancel</button>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  };
  
  function showSettingsMenu(uid) {
    const menu = document.getElementById(`settings-menu-${uid}`);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
  
  function dontWatch(uid) {
    const videoContainer = document.getElementById(`video-wrapper-${uid}`);
    if (videoContainer) {
      videoContainer.style.display = 'none';
    }
    showSettingsMenu(uid);
  }
  
  function pinVideo(uid) {
    const videoContainer = document.getElementById(`video-wrapper-${uid}`);
    if (videoContainer) {
      document.getElementById('user-streams').prepend(videoContainer);
    }
    showSettingsMenu(uid);
  }

  
  function fullScreenVideo(uid) {
    const videoContainer = document.getElementById(`video-wrapper-${uid}`);
    if (videoContainer) {
      videoContainer.classList.toggle('fullscreen');
    }
    showSettingsMenu(uid);
  }
  
  function cancelSettings(uid) {
    showSettingsMenu(uid);
  }
  
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.settings-btn') && !event.target.closest('.settings-menu')) {
      document.querySelectorAll('.settings-menu').forEach(menu => {
        menu.style.display = 'none';
      });
    }
  });

  client.on("user-joined", (user) => {
    remoteTracks[user.uid] = user;
    updateUsersList();
  });

  client.on("user-left", (user) => {
    delete remoteTracks[user.uid];
    updateUsersList();
  });

  updateUsersList();
};

addUsersList();

  // Create and append the placeholder image
  const addPlaceholderImage = (uid) => {
    const videoContainer = document.getElementById(`video-wrapper-${uid}`);
    if (!videoContainer) return;
  
    // Remove any existing placeholder
    const existingPlaceholder = videoContainer.querySelector(".placeholder-container");
    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }
  
    // Create and append the placeholder image
    const placeholderContainer = document.createElement("div");
    placeholderContainer.className = "placeholder-container";
    placeholderContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #1a1a1a;
    `;
  
    const placeholderImage = document.createElement("img");
    placeholderImage.src = "./assets/User_Avatar.png";
    placeholderImage.alt = "Camera Off";
    placeholderImage.style.cssText = `
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 50%;
    `;
  
    placeholderContainer.appendChild(placeholderImage);
    videoContainer.appendChild(placeholderContainer);
  };

//Leave Button Action
document.getElementById("leave-btn").addEventListener("click", async () => {
  //Loop threw local tracks and stop them so unpublish event gets triggered, then set to undefined
  //Hide footer
  for (trackName in localTracks) {
    let track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = null;
    }
  }

  //Leave the channel
  await client.leave();
  document.getElementById("footer").style.display = "none";
  document.getElementById("user-streams").innerHTML = "";
  document.getElementById("join-wrapper").style.display = "block";
  // Hide users list button and sidebar when leaving
  document.getElementById("users-list-btn").style.display = "none";
  const usersSidebar = document.getElementById("users-sidebar");
  if (usersSidebar) {
    usersSidebar.style.right = "-390px";
  }
});
// Join notification sound
const joinSound = new Audio("./assets/notification-20-270145.mp3");
let handleUserJoined = async (user, mediaType) => {
  console.log("Handle user joined");

  remoteTracks[user.uid] = user;

  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    let player = document.getElementById(`video-wrapper-${user.uid}`);
    if (player != null) {
      player.remove();
    }

    player = `<div class="video-containers" id="video-wrapper-${user.uid}">
                <p class="user-uid"><img class="volume-icon" id="volume-${user.uid}" src="./assets/volume-on.svg" /> ${user.uid}</p>
                <div class="video-player player" id="stream-${user.uid}"></div>
                <div class="video-logo">
                  <img src="./assets/Go-Link-logo2.png" alt="Go-Link Logo" />
                </div>
                 <div class="video-settings">
                    <button class="settings-btn" onclick="showSettingsMenu('${config.uid}')">⋮</button>
                    <div class="settings-menu" id="settings-menu-${config.uid}">
                        <button onclick="dontWatch('${config.uid}')">Don’t Watch</button>
                        <button onclick="pinVideo('${config.uid}')">Pin</button>
                        <button onclick="fullScreenVideo('${config.uid}')">Full Screen</button>
                        <button onclick="cancelSettings('${config.uid}')">Cancel</button>
                    </div>
                </div>
              </div>`;
    document.getElementById("user-streams").insertAdjacentHTML("beforeend", player);

    // Check if the remote user's video is muted and show placeholder
    if (user.videoTrack && user.videoTrack.muted) {
      addPlaceholderImage(user.uid);
    } else {
      user.videoTrack.play(`stream-${user.uid}`);
    }
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }

  const audio = new Audio("./assets/notification-20-270145.mp3");
  audio.play();
  sendMessage("System Notice", `${user.uid} joined the meeting`);
};

function showSettingsMenu(uid) {
  const menu = document.getElementById(`settings-menu-${uid}`);
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function dontWatch(uid) {
  const videoContainer = document.getElementById(`video-wrapper-${uid}`);
  videoContainer.style.display = 'none';
  showSettingsMenu(uid);
}

function fullScreenVideo(uid) {
  const videoContainer = document.getElementById(`video-wrapper-${uid}`);
  videoContainer.classList.toggle('fullscreen');
  showSettingsMenu(uid);
}

function cancelSettings(uid) {
  showSettingsMenu(uid);
}

document.getElementById('video-tiles-toggle').addEventListener('change', function() {
  const videoTiles = document.querySelectorAll('.video-containers');
  if (this.checked) {
      videoTiles.forEach(tile => tile.style.display = 'block');
  } else {
      videoTiles.forEach(tile => tile.style.display = 'none');
  }
});

document.getElementById('video-quality').addEventListener('change', function () {
  const quality = this.value;
  if (localTracks.videoTrack) {
    switch (quality) {
      case 'low':
        localTracks.videoTrack.setEncoderConfiguration('120p');
        break;
      case 'medium':
        localTracks.videoTrack.setEncoderConfiguration('360p');
        break;
      case 'high':
        localTracks.videoTrack.setEncoderConfiguration('720p');
        break;
    }
  }
});

let handleUserLeft = (user) => {
  console.log("Handle user left!");
  // Remove from remote users and fade out UID
  delete remoteTracks[user.uid];
  const videoWrapper = document.getElementById(`video-wrapper-${user.uid}`);
  if (videoWrapper) {
    videoWrapper.style.opacity = "0.5";
    setTimeout(() => videoWrapper.remove(), 1000); // Fade out and remove after 1 second
  }
  sendMessage("System Notice", `${user.uid} left the meeting`);
};

//DARK MODE SETTINGS
document.getElementById('dark-mode').addEventListener('change', function () {
  document.body.classList.toggle('dark-mode', this.checked);
  localStorage.setItem('darkMode', this.checked);
});

// On page load, check if dark mode is enabled
const darkMode = localStorage.getItem('darkMode') === 'true';
document.getElementById('dark-mode').checked = darkMode;
document.body.classList.toggle('dark-mode', darkMode);

//AUTO-CAMERA OFF PREFERENCE
document.getElementById('auto-camera-off').addEventListener('change', function () {
  localStorage.setItem('autoCameraOff', this.checked);
});

//NOISE SUPPRESSION
document.getElementById('noise-suppression').addEventListener('change', function () {
  if (localTracks.audioTrack) {
    localTracks.audioTrack.setEnabled(!this.checked);
  }
});

//VIRTUAL BACKGROUND FOR VIDEO
let backgroundMode = 'none';
let bodyPixNet;

document.getElementById('background-mode').addEventListener('change', function () {
  backgroundMode = this.value;
  applyBackgroundEffect();
});

async function applyBackgroundEffect() {
  if (!bodyPixNet) {
    bodyPixNet = await bodyPix.load();
  }

  const videoElement = document.getElementById(`stream-${config.uid}`).querySelector('video');
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');

  const processFrame = async () => {
    if (backgroundMode === 'none') {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    } else {
      const segmentation = await bodyPixNet.segmentPerson(videoElement);
      const background = await createBackground(canvas.width, canvas.height);
      bodyPix.drawBokehEffect(canvas, videoElement, segmentation, background, 7, 0.7);
    }
    requestAnimationFrame(processFrame);
  };

  processFrame();
}

async function createBackground(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (backgroundMode === 'blur') {
    ctx.filter = 'blur(10px)';
    ctx.drawImage(document.getElementById(`stream-${config.uid}`).querySelector('video'), 0, 0, width, height);
  } else if (backgroundMode === 'virtual') {
    const img = new Image();
    img.src = './assets/Virtual_Background_1.jpg'; // Add a virtual background image
    await img.decode();
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas;
}




//SCREEN SHARING WITH PICTURE IN PICTURE MODE
let isScreenSharing = false;
let screenTrack = null;

document
  .getElementById("screen-share-btn")
  .addEventListener("click", async () => {
    if (!isScreenSharing) {
      try {
        // Create screen video track (with optional audio)
        const tracks = await AgoraRTC.createScreenVideoTrack(
          {
            encoderConfig: "1080p_1",
            optimizationMode: "detail",
          },
          "auto"
        );

        // Create a new container for the camera feed
        const pipContainer = document.createElement("div");
        pipContainer.id = "pip-container";
        pipContainer.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 120px;
                height: 120px;
                z-index: 1000;
                border: 2px solid white;
                border-radius: 8px;
                overflow: hidden;
            `;
        document
          .getElementById(`video-wrapper-${config.uid}`)
          .appendChild(pipContainer);

        // Move the camera feed to PIP container
        if (localTracks.videoTrack) {
          await client.unpublish(localTracks.videoTrack);
          localTracks.videoTrack.play(pipContainer.id);
        }

        // Handle both array and single track cases
        if (Array.isArray(tracks)) {
          // If tracks includes audio, publish both video and audio tracks
          const [videoTrack, audioTrack] = tracks;
          await client.publish([videoTrack, audioTrack]);
          videoTrack.play(`stream-${config.uid}`);
          screenTrack = tracks; // Store the array of tracks
        } else {
          // If tracks is only video, publish the video track
          await client.publish(tracks);
          tracks.play(`stream-${config.uid}`);
          screenTrack = tracks; // Store the single track
        }

        // Update UI and state
        isScreenSharing = true;
        document.getElementById("screen-share-btn").style.backgroundColor =
          "blue";
        document
          .getElementById(`video-wrapper-${config.uid}`)
          .classList.add("screen-sharing");
      } catch (error) {
        console.error("Error starting screen share:", error);
      }
    } else {
      try {
        // Stop screen sharing
        if (screenTrack) {
          if (Array.isArray(screenTrack)) {
            // If screenTrack is an array, unpublish and stop both tracks
            const [videoTrack, audioTrack] = screenTrack;
            await client.unpublish([videoTrack, audioTrack]);
            videoTrack.stop();
            audioTrack.stop();
            videoTrack.close();
            audioTrack.close();
          } else {
            // If screenTrack is a single track
            await client.unpublish(screenTrack);
            screenTrack.stop();
            screenTrack.close();
          }
          screenTrack = null;
        }

        // Remove PIP container
        const pipContainer = document.getElementById("pip-container");
        if (pipContainer) {
          pipContainer.remove();
        }

        // Re-enable camera in main container
        localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
        await client.publish(localTracks.videoTrack);
        localTracks.videoTrack.play(`stream-${config.uid}`);

        // Update UI and state
        isScreenSharing = false;
        document.getElementById("screen-share-btn").style.backgroundColor =
          "white";
        document
          .getElementById(`video-wrapper-${config.uid}`)
          .classList.remove("screen-sharing");
      } catch (error) {
        console.error("Error stopping screen share:", error);
      }
    }
  });

// Settings modal functionality
const settingsModal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const closeSettings = document.getElementById("close-settings");
const recordBtn = document.getElementById("record-btn");
const streamBtn = document.getElementById("stream-btn");


settingsBtn.onclick = () => {
  settingsModal.style.display = "block";
};

closeSettings.onclick = () => {
  settingsModal.style.display = "none";
};

window.onclick = (event) => {
  if (event.target == settingsModal) {
    settingsModal.style.display = "none";
  }
};

//GO-LINK VIDEO CONFERENCING RECORD STREAM FUNCTION
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let faviconCanvas;
let faviconContext;
let faviconInterval;

// Load the notification sounds
const startSound = new Audio("./assets/smooth-simple-notification-274738.mp3");
const stopSound = new Audio("./assets/reverby-notification-sound-246407.mp3");

// Function to create an animated favicon with "REC"
function startFaviconAnimation() {
  faviconCanvas = document.createElement("canvas");
  faviconCanvas.width = 18;
  faviconCanvas.height = 18;
  faviconContext = faviconCanvas.getContext("2d");

  let isRed = false;

  faviconInterval = setInterval(() => {
    faviconContext.clearRect(0, 0, 16, 16);
    faviconContext.fillStyle = isRed ? "#ff0000" : "#000000";
    faviconContext.fillRect(0, 0, 16, 16);
    faviconContext.fillStyle = "#ffffff";
    faviconContext.font = "7px Arial Bold";
    faviconContext.fillText("REC", 2, 12);

    const faviconLink = document.getElementById("favicon");
    faviconLink.href = faviconCanvas.toDataURL("image/png");

    isRed = !isRed;
  }, 500);
}

// Function to stop the animated favicon
function stopFaviconAnimation() {
  clearInterval(faviconInterval);
  const faviconLink = document.getElementById("favicon");
  faviconLink.href = "./assets/Go-Link-logo2.png"; // Reset to the original favicon
}

document.getElementById("record-btn").addEventListener("click", async () => {
  if (!isRecording) {
    console.log("Starting recording...");
    isRecording = true;
    recordBtn.textContent = "STOP";
    recordBtn.style.backgroundColor = "red";

    startSound.play();
    startFaviconAnimation();

    try {
      // Automatically capture the entire screen without prompting
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // Capture the entire screen
          cursor: "always", // Include the cursor
        },
        audio: true, // Request system audio
      });

      // Capture audio from the user's microphone
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Combine the display stream (with system audio) and the microphone audio
      const tracks = [
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(), // Include system audio
        ...audioStream.getAudioTracks(), // Include microphone audio
      ];
      const combinedStream = new MediaStream(tracks);

      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp9,opus", // Use a supported codec
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "glvc_recording.webm"; // Save as .webm for better compatibility
        document.body.appendChild(a);

        if (confirm("Recording stopped. Do you want to save the video?")) {
          a.click();
        }

        URL.revokeObjectURL(url);
        recordedChunks = [];

        tracks.forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      isRecording = false;
      recordBtn.textContent = "START";
      recordBtn.style.backgroundColor = "blue";
      stopFaviconAnimation();
    }
  } else {
    console.log("Stopping recording...");
    isRecording = false;
    recordBtn.textContent = "START";
    recordBtn.style.backgroundColor = "blue";

    stopSound.play();
    stopFaviconAnimation();

    mediaRecorder.stop();
  }
});
