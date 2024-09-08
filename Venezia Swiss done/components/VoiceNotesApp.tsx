"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play } from "lucide-react";
import * as Dialog from '@radix-ui/react-dialog';
import { useDeepgram } from '../lib/contexts/DeepgramContext';
import { addDocument } from '../lib/firebase/firebaseUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type VoiceNote = {
  id: string;
  url: string;
  timestamp: string;
  transcript: string;
};

export default function VoiceNotesApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const { connectToDeepgram, disconnectFromDeepgram, realtimeTranscript } = useDeepgram();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    await connectToDeepgram();
    setIsRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    drawWaveform();
  };

  const stopRecording = async () => {
    disconnectFromDeepgram();
    setIsRecording(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (realtimeTranscript) {
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        url: '', // We don't have actual audio URL in this implementation
        timestamp: format(new Date(), "d MMMM yyyy 'alle' HH:mm", { locale: it }),
        transcript: realtimeTranscript,
      };
      setVoiceNotes(prev => [newNote, ...prev]);
      await addDocument('notes', {
        text: realtimeTranscript,
        timestamp: newNote.timestamp,
      });
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;
      analyserRef.current!.fftSize = 2048;
      const bufferLength = analyserRef.current!.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      analyserRef.current!.getByteTimeDomainData(dataArray);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
      canvasCtx.beginPath();

      const sliceWidth = WIDTH * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * HEIGHT / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  return (
    <div className="min-h-screen bg-red-600 text-white font-sans">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-4 gap-4 h-screen">
          <div className="col-span-2 row-span-2 flex items-center justify-center">
            <h1 className="text-6xl font-bold">NOTE VOCALI</h1>
          </div>
          <div className="col-span-2 flex items-center justify-center">
            <p className="text-xl">Cattura i tuoi pensieri con facilità</p>
          </div>
          <div className="col-span-2 row-span-2 flex items-center justify-center">
            <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center">
              {isRecording ? (
                <Button onClick={stopRecording} variant="ghost" size="lg" className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 text-white">
                  <Square className="h-16 w-16" />
                </Button>
              ) : (
                <Button onClick={startRecording} variant="ghost" size="lg" className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 text-white">
                  <Mic className="h-16 w-16" />
                </Button>
              )}
            </div>
          </div>
          <div className="col-span-4">
            {isRecording && (
              <div className="bg-white p-4 rounded-lg">
                <canvas ref={canvasRef} width={800} height={100} className="w-full" />
                <p className="mt-2 text-black">{realtimeTranscript}</p>
              </div>
            )}
          </div>
          <div className="col-span-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 32rem)'}}>
            {voiceNotes.map((note) => (
              <Card key={note.id} className="mb-4 bg-white text-black">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-grow">
                    <p className="font-bold">{note.timestamp}</p>
                    <p className="text-sm truncate">{note.transcript}</p>
                  </div>
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <Button variant="outline" size="sm" className="ml-4 text-red-600 border-red-600 hover:bg-red-50">
                        <Play className="h-4 w-4 mr-2" />
                        Riproduci
                      </Button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                      <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <Dialog.Title className="text-lg font-bold mb-4 text-black">Nota Vocale</Dialog.Title>
                        <p className="mb-4 text-gray-600">{note.timestamp}</p>
                        <div className="mb-4">
                          <p className="font-medium text-gray-700">Trascrizione:</p>
                          <p className="text-gray-600">{note.transcript}</p>
                        </div>
                        <Dialog.Close asChild>
                          <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Chiudi</Button>
                        </Dialog.Close>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}