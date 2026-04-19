import { Composition } from "remotion";
import { VerticalShort } from "./VerticalShort";

export const RemotionRoot = () => (
  <Composition
    id="VerticalShort"
    component={VerticalShort}
    durationInFrames={900}   // overridden at render time
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      videoSrc: "",
      captions: [],
      clipStart: 0,
      clipDuration: 30,
    }}
  />
);
