"use client";
import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";

export default function GdeltVisualizer() {
    const [payload, setPayload] = useState<any | null>(null);
    const [text, setText] = useState("");

    const handleLoad = () => {
        try {
            const parsed = JSON.parse(text);
            setPayload(parsed);
        } catch (err) {
            alert("Invalid JSON");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">📰 GDELT Event Visualization</h1>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                className="w-full border rounded-md p-2 font-mono text-sm"
                placeholder="Paste the Python payload JSON here..."
            />

            <button
                onClick={handleLoad}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
                Load Visualization
            </button>

            {payload && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Query: {payload.query}</h2>
                    <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
                        {payload.summary}
                    </pre>

                    <LineChart
                        width={900}
                        height={400}
                        data={payload.timeline}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="smoothed"
                            stroke="#1E90FF"
                            dot={false}
                            name="Smoothed Volume"
                        />
                        <Line type="monotone" dataKey="trend" stroke="#FFA500" dot={false} name="Trend" />
                        {payload.events?.map((ev: any, i: number) => (
                            <ReferenceArea
                                key={i}
                                x1={ev.start}
                                x2={ev.end}
                                strokeOpacity={0.3}
                                fill="red"
                                fillOpacity={0.15}
                                label={`Event ${i + 1}`}
                            />
                        ))}
                    </LineChart>
                </div>
            )}
        </div>
    );
}
