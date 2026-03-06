export function nvidiaConfig() {
    return {    
        resources: {
            reservations: {
                devices: [
                    {
                        driver: "nvidia",
                        count: "all",
                        capabilities: [
                            "gpu"
                        ]
                    }
                ]
            }
        }
    }
}

export function cpuConfig() {
    return {}
}