import { useNavigate } from "react-router-dom";
import { Loader, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import eightBallUrl from "@/assets/8ball.svg";

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
      <div className="relative h-24 w-24">
        <Loader
          className="absolute inset-0 h-full w-full text-white"
          style={{
            animation:
              "spin 0.25s linear infinite, fade-out 0.25s ease-out 0.6s forwards",
          }}
        />
        <img
          src={eightBallUrl}
          alt="8 ball"
          className="absolute inset-0 h-full w-full"
          style={{
            opacity: 0,
            animation:
              "ball-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s forwards",
          }}
        />
      </div>

      <h1
        className="text-4xl font-bold tracking-widest text-white"
        style={{
          opacity: 0,
          animation: "fade-down 0.5s ease-out 1.1s forwards",
        }}
      >
        Legg
      </h1>
      <h2 className="text-lg text-gray-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          Lincoln League, Tel Aviv
        </div>
      </h2>

      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.4s ease-out 1.5s forwards",
        }}
      >
        <Button
          size="lg"
          className="px-12 text-base uppercase tracking-widest bg-stone-500 text-black"
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
      </div>
    </div>
  );
};
