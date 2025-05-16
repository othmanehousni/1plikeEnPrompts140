interface TogetherAIProps {
	className?: string;
}

const TogetherAI = ({ className }: TogetherAIProps) => {
	return (
		<svg
			fill="currentColor"
			fillRule="evenodd"
			height="1em"
			style={{ flex: "none", lineHeight: 1 }}
			viewBox="0 0 24 24"
			width="1em"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>together.ai</title>
			<g>
				<path
					d="M17.385 11.23a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm0 10.77a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm-10.77 0a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23z"
					opacity=".2"
				/>
				<circle cx="6.615" cy="6.615" fill="#0F6FFF" r="4.615" />
			</g>
		</svg>
	);
};

export default TogetherAI;
