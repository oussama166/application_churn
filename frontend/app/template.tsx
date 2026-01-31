'use client'

import { motion } from "framer-motion"

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} // Start slightly down and invisible
            animate={{ opacity: 1, y: 0 }}  // Slide up and fade in
            transition={{ ease: "easeInOut", duration: 0.75 }} // Slow duration (0.75s) so you can see it
            style={{ width: '100%' }} // Ensure it doesn't collapse
        >
            {children}
        </motion.div>
    )
}