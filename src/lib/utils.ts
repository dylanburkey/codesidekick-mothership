import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short', day: 'numeric', year: 'numeric'
	}).format(new Date(d));
}

export function formatRelative(d: string | Date) {
	const diff = Date.now() - new Date(d).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}
