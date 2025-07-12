import { useId } from "react";
import { useTheme } from "next-themes";
import { CheckIcon } from "lucide-react";
import Image from "next/image";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const items = [
	{ value: "light", label: "Light", image: "/settings/ui-light.png" },
	{ value: "dark", label: "Dark", image: "/settings/ui-dark.png" },
	{ value: "system", label: "System", image: "/settings/ui-system.png" },
];

export default function ThemeSwitcher() {
	const id = useId();
	const { theme, setTheme } = useTheme();
	
	return (
		<div className="space-y-4">
			<RadioGroup 
				className="grid grid-cols-3 gap-4" 
				value={theme || "system"} 
				onValueChange={setTheme}
			>
				{items.map((item) => {
					const inputId = `${id}-${item.value}`;
					return (
						<div key={inputId} className="relative group">
							<RadioGroupItem
								id={inputId}
								value={item.value}
								className="peer sr-only"
							/>
							<label 
								htmlFor={inputId} 
								className="flex flex-col cursor-pointer"
							>
								<div className="relative overflow-hidden rounded-lg border-2 transition-all duration-200 
									peer-focus-visible:ring-4 peer-focus-visible:ring-ring/30
									group-hover:border-border/80
									peer-data-[state=checked]:border-primary">
									<Image
										src={item.image}
										alt={item.label}
										width={200}
										height={150}
										className="aspect-[4/3] object-cover w-full h-auto bg-background/50"
									/>
									<div className="absolute inset-0 peer-data-[state=checked]:bg-primary/10 transition-colors duration-200" />
									
									<div className="absolute top-2 right-2 size-4 rounded-full border-2 border-muted flex items-center justify-center bg-background 
										peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary">
										<CheckIcon 
											size={10} 
											className="text-white opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity" 
											strokeWidth={3}
										/>
									</div>
								</div>
								<div className="mt-2 text-center">
									<span className="text-sm font-medium text-foreground">{item.label}</span>
								</div>
							</label>
						</div>
					);
				})}
			</RadioGroup>
		</div>
	);
}
