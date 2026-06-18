"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeech() {
	const [supported, setSupported] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

	useEffect(() => {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		const supportTimer = window.setTimeout(() => setSupported(true), 0);

		const loadVoices = () => {
			voicesRef.current = window.speechSynthesis.getVoices();
		};
		// Browsers may already have voices ready (Firefox) or fire voiceschanged (Chrome)
		loadVoices();
		window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
		return () => {
			window.clearTimeout(supportTimer);
			window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
		};
	}, []);

	const speak = useCallback((text: string, lang = 'zh-CN') => {
		if (!supported || !text.trim()) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = lang;
		utterance.rate = 0.9;
		const zhVoice = voicesRef.current.find((v) => v.lang.startsWith('zh'));
		if (zhVoice) utterance.voice = zhVoice;
		utterance.onstart = () => setSpeaking(true);
		utterance.onend = () => setSpeaking(false);
		utterance.onerror = () => setSpeaking(false);
		window.speechSynthesis.speak(utterance);
	}, [supported]);

	const stop = useCallback(() => {
		if (supported) {
			window.speechSynthesis.cancel();
			setSpeaking(false);
		}
	}, [supported]);

	return { supported, speaking, speak, stop };
}
