import { Composition } from "remotion";
import { BurrFxBotFlow } from "./BurrFxBotFlow";
import {
  BurrFxMobileControl,
  BurrFxProductShowcase,
} from "./ProductShowVideos";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="BurrFxBotFlow"
        component={BurrFxBotFlow}
        durationInFrames={180}
        fps={30}
        width={960}
        height={540}
      />
      <Composition
        id="BurrFxProductShowcase"
        component={BurrFxProductShowcase}
        durationInFrames={360}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="BurrFxMobileControl"
        component={BurrFxMobileControl}
        durationInFrames={300}
        fps={30}
        width={720}
        height={1280}
      />
    </>
  );
};
