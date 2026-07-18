package com.todotrack.app;

import com.getcapacitor.BridgeActivity;
import com.todotrack.app.plugins.DownloadPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DownloadPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
