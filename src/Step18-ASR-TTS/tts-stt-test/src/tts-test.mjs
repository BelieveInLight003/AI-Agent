import tencentCloud from 'tencentcloud-sdk-nodejs-tts';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const TtsClient = tencentCloud.tts.v20190823.Client;
const ttsClient = new TtsClient({
  credential: {
    secretId: process.env.SECRET_ID,
    secretKey: process.env.SECRET_KEY,
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'tts.tencentcloudapi.com',
    },
  },
});

const params = {
  Text: '下班路上听到周传雄的青花，很开心，听了很多年的情歌',
  VoiceType: 502005,
  SessionId: 'session_001',
  Codec: 'mp3',
};

ttsClient.TextToVoice(params, (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const audioBuffer = Buffer.from(data.Audio, 'base64');
  const audioPath = './output.mp3';
  fs.writeFileSync(audioPath, audioBuffer, (error) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log('Audio saved to output.mp3');
  });
});
