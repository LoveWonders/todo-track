package com.todotrack.app;

import com.getcapacitor.BridgeActivity;
import com.todotrack.app.plugins.DownloadPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(DownloadPlugin.class);
    }
}
