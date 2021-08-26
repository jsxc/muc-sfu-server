
const constraints = {
    audio: false,
    video: {
        mandatory: {
            maxWidth: 320,
            maxFrameRate: 15,
            minFrameRate: 15
        }
    }
};
const localVideoElement = $('#local');
const rtcPeers = {};
const socket = io("ws://localhost:3000");

function requestStream(roomId, name, src) {
    console.log('Request stream from ' + src);

    const videoElement = $('<video muted autoplay/>');
    videoElement.appendTo('#container');
    videoElement.attr('title', src);

    const options = {
        remoteVideo: videoElement.get(0),
        onicecandidate: (candidate) => {
            console.log(`Send ice candidate for ${src}`);
            socket.emit('iceCandidate', {name: src, candidate});
        }
    }

    const rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (error) {
            if (error) {
                return console.error(error);
            }

            this.generateOffer((error, offer) => {
                socket.emit('requestStream', { roomId, name, src, offer }, (answer) => {
                    rtcPeer.processAnswer(answer, function (error) {
                        if (error) return console.error(error);

                        console.log('answer processed');
                    });
                });
            });
        });

    rtcPeers[src] = rtcPeer;
}

socket.on("connect", () => {
    console.log('Connection ready');
})

socket.on('joined', (data) => {
    console.log(`${data.name} joined the room ${data.roomId}`);

    requestStream(data.roomId, $('#name').val(), data.name);
});

socket.on('iceCandidate', ({peerId, candidate}) => {
    console.log('OnIceCandidate', peerId, !!rtcPeers[peerId], candidate)

    if (rtcPeers[peerId]) {
        rtcPeers[peerId].addIceCandidate(candidate, (...args) => {
            console.log('addIceCandidate callback', args);
        });
    } else {
        console.warn(`Received ICE candidates for unknown peer "${peerId}"`);
    }
});

$('#join').on('click', () => {
    const name = $('#name').val();
    const roomId = $('#room').val();

    socket.emit('join', { roomId, name }, (participants) => {
        console.log('join cb', participants);

        console.log('The following people are in the room: ' + participants);

        const options = {
            localVideo: localVideoElement.get(0),
            mediaConstraints: constraints,
            onicecandidate: (candidate) => {
                socket.emit('iceCandidate', {name, candidate});
            }
        };

        const rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
            function (error) {
                if (error) {
                    return console.error(error);
                }
                this.generateOffer((error, offer) => {
                    socket.emit('requestStream', { roomId, name, src: name, offer }, (answer) => {
                        rtcPeer.processAnswer(answer, function (error) {
                            if (error) return console.error(error);

                            console.log('answer processed');

                            for (const participant of participants) {
                                requestStream(roomId, name, participant);
                            }
                        });
                    })
                });
            });

        rtcPeers[name] = rtcPeer;
    });
});