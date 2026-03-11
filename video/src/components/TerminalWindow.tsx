import { AbsoluteFill } from "remotion";
import { COLORS, TERMINAL } from "../constants";
import { mono } from "../fonts";

export const TerminalWindow: React.FC<{
  children: React.ReactNode;
  showTitleBar?: boolean;
}> = ({ children, showTitleBar = true }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #1e2040 0%, ${COLORS.background} 70%)`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: mono,
      }}
    >
      <div
        style={{
          width: TERMINAL.width,
          height: TERMINAL.height,
          backgroundColor: COLORS.terminalBg,
          borderRadius: TERMINAL.borderRadius,
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${COLORS.dimGray}`,
        }}
      >
        {showTitleBar && (
          <div
            style={{
              height: TERMINAL.titleBarHeight,
              backgroundColor: COLORS.titleBar,
              display: "flex",
              alignItems: "center",
              paddingLeft: 20,
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: COLORS.red,
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: COLORS.yellow,
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: COLORS.green,
              }}
            />
            <div
              style={{
                flex: 1,
                textAlign: "center",
                color: COLORS.gray,
                fontSize: 14,
                marginRight: 60,
              }}
            >
              mclaude
            </div>
          </div>
        )}
        <div
          style={{
            flex: 1,
            padding: TERMINAL.padding,
            display: "flex",
            flexDirection: "column",
            fontSize: TERMINAL.fontSize,
            lineHeight: `${TERMINAL.lineHeight}px`,
            color: COLORS.white,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
